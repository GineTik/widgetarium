import type { CollectionGateway, FilterRow, GatewayBase, GatewayEvent, Ref, Row, Unsubscribe, ValueGateway } from "./contract";
import { collectionGateway, valueGateway } from "./create";
import { fieldOf } from "./match";
import type { Narrowing } from "./narrow";
import { isEmpty, narrowedCollection, normalizeWhere } from "./narrow";

export type AnyGateway = GatewayBase & Record<string, unknown>;
export type Subscribe = (listener: (event: GatewayEvent) => void) => Unsubscribe;

export interface RefDescription {
	ref?: Ref;
	tile: string;
	prop: string;
	label: string;
	title: string;
	kind: string;
	shape?: string;
}

export interface GatewayRefs {
	put(ref: Ref, gateway: AnyGateway | null, told?: { describes?: RefDescription; dependsOn?: Ref[] }): void;
	drop(ref: Ref, gateway?: AnyGateway | null): void;
	read(ref: Ref): Promise<unknown>;
	watch(refs: Ref[], listener: () => void): Unsubscribe;
	get(ref: Ref): AnyGateway | null;
	offered(): RefDescription[];
	subscribe(listener: () => void): Unsubscribe;
}

interface RefsState {
	held: Map<Ref, AnyGateway>;
	described: Map<Ref, RefDescription>;
	listeners: Set<() => void>;
	depends: Map<Ref, Ref[]>;
	isQueued: boolean;
}

export const refOf = (tileId: string, name: string): Ref => `${tileId}/${name}`;

export function pickedValue(chosen: unknown): string {
	const held = Array.isArray(chosen) ? chosen[0] : chosen;
	return held === undefined || held === null ? "" : String(held);
}

function combined(subscribes: (Subscribe | null)[]): Subscribe {
	return (listener) => {
		const stops = subscribes.filter(Boolean).map((hang) => (hang as Subscribe)(listener));
		return () => {
			for (const stop of stops) stop();
		};
	};
}

function notify(state: RefsState) {
	if (state.isQueued) return;
	state.isQueued = true;
	queueMicrotask(() => {
		state.isQueued = false;
		for (const listener of [...state.listeners]) listener();
	});
}

function put(state: RefsState, ref: Ref, gateway: AnyGateway | null, told?: { describes?: RefDescription; dependsOn?: Ref[] }) {
	const before = state.held.get(ref);
	if (gateway) state.held.set(ref, gateway);
	else state.held.delete(ref);
	if (told?.describes) state.described.set(ref, { ...told.describes, ref });
	state.depends.set(ref, told?.dependsOn ?? []);
	if (before?.id !== gateway?.id) notify(state);
}

function drop(state: RefsState, ref: Ref, gateway?: AnyGateway | null) {
	if (gateway && state.held.get(ref) !== gateway) return;
	if (!state.held.has(ref) && !state.described.has(ref)) return;
	state.held.delete(ref);
	state.described.delete(ref);
	state.depends.delete(ref);
	notify(state);
}

function loops(state: RefsState, from: Ref): boolean {
	const seen = new Set<Ref>();
	const walk = (ref: Ref): boolean => {
		for (const next of state.depends.get(ref) ?? []) {
			if (next === from) return true;
			if (seen.has(next)) continue;
			seen.add(next);
			if (walk(next)) return true;
		}
		return false;
	};
	return walk(from);
}

function watch(state: RefsState, refs: Ref[], listener: () => void): Unsubscribe {
	let stops: Unsubscribe[] = [];
	const hangOn = () => {
		for (const stop of stops) stop();
		stops = refs.map((ref) => state.held.get(ref)?.subscribe(listener)).filter(Boolean) as Unsubscribe[];
	};
	const rehang = () => {
		hangOn();
		listener();
	};
	hangOn();
	state.listeners.add(rehang);
	return () => {
		for (const stop of stops) stop();
		state.listeners.delete(rehang);
	};
}

type Reader = { get?: { (): Promise<unknown>; can(): { can: boolean } } };

function answers(gateway: AnyGateway | undefined): boolean {
	const read = (gateway as Reader | undefined)?.get;
	return typeof read === "function" && read.can().can !== false;
}

async function read(state: RefsState, ref: Ref): Promise<unknown> {
	const gateway = state.held.get(ref);
	if (!answers(gateway)) return null;
	if (loops(state, ref)) {
		console.warn(`Widgetarium: "${ref}" reads its own answer back — the loop is cut here`);
		return null;
	}
	return (gateway as unknown as ValueGateway<unknown>).get();
}

function memoryCell(key: string): ValueGateway<unknown> {
	const cell: { value: unknown } = { value: null };
	return valueGateway<unknown>({
		id: `memory:${key}`,
		handlers: {
			get: () => cell.value,
			update: (next: unknown) => {
				cell.value = next ?? null;
				return cell.value;
			},
			remove: () => {
				cell.value = null;
			},
		},
	});
}

export function createViewCells(): (key: string) => ValueGateway<unknown> {
	const cells = new Map<string, ValueGateway<unknown>>();
	return (key) => {
		if (!cells.has(key)) cells.set(key, memoryCell(key));
		return cells.get(key) as ValueGateway<unknown>;
	};
}

export function createGatewayRefs(): GatewayRefs {
	const state: RefsState = { held: new Map(), described: new Map(), listeners: new Set(), depends: new Map(), isQueued: false };
	return {
		put: (ref, gateway, told) => put(state, ref, gateway, told),
		drop: (ref, gateway) => drop(state, ref, gateway),
		read: (ref) => read(state, ref),
		watch: (refs, listener) => watch(state, refs, listener),
		get: (ref) => state.held.get(ref) ?? null,
		offered: () => [...state.described.values()],
		subscribe(listener) {
			state.listeners.add(listener);
			return () => state.listeners.delete(listener);
		},
	};
}

function isUnwired(held: unknown): boolean {
	return typeof held === "object" && held !== null && typeof (held as { wants?: unknown }).wants === "string" && typeof (held as { ref?: unknown }).ref !== "string";
}

function refIn(row: FilterRow | null | undefined): Ref | null {
	const named = row?.spread?.ref ?? (row?.value as { ref?: unknown } | undefined)?.ref;
	return typeof named === "string" ? named : null;
}

export function refsWithin(rows: FilterRow[] | null | undefined): Ref[] {
	return (rows ?? []).map(refIn).filter(Boolean) as Ref[];
}

const NOT_A_NARROWING = 'Widgetarium: "{ref}" answered with something no condition can be made of, so it narrows nothing.';

function isNarrowing(chosen: unknown): chosen is Narrowing {
	return Array.isArray(chosen) || (typeof chosen === "object" && chosen !== null);
}

function spreadClauses(chosen: unknown, by: Ref): FilterRow[] {
	if (isEmpty(chosen)) return [];
	if (isNarrowing(chosen)) return normalizeWhere(chosen, by);
	console.warn(NOT_A_NARROWING.replace("{ref}", by));
	return [];
}

function clausesOn(row: FilterRow, chosen: unknown, by: Ref): FilterRow[] {
	if (isEmpty(chosen)) return [];
	if (!Array.isArray(chosen)) return [{ ...row, value: chosen, by }];
	return [{ prop: row.prop, op: "in", value: chosen, by }];
}

async function resolvedRow(row: FilterRow, refs: GatewayRefs): Promise<FilterRow[]> {
	if (isUnwired(row?.spread) || isUnwired(row?.value)) return [];
	const spread = row?.spread?.ref;
	if (typeof spread === "string") return spreadClauses(await refs.read(spread), spread);
	const named = refIn(row);
	if (!named) return [row];
	return clausesOn(row, await refs.read(named), named);
}

export async function resolveWhere(rows: FilterRow[], refs: GatewayRefs): Promise<FilterRow[]> {
	const out: FilterRow[] = [];
	for (const row of rows) out.push(...(await resolvedRow(row, refs)));
	return out;
}

export function narrowedByRefs<T>(base: CollectionGateway<T>, rows: FilterRow[] | null | undefined, refs: GatewayRefs): CollectionGateway<T> {
	const held = rows ?? [];
	const named = refsWithin(held);
	return narrowedCollection<T>(
		base,
		held,
		(asked) => resolveWhere(asked, refs),
		combined([base.subscribe, named.length > 0 ? ((listener) => refs.watch(named, listener as () => void)) as Subscribe : null]),
	);
}

export function refValue(refs: GatewayRefs, ref: Ref, id?: string): ValueGateway<unknown> {
	const target = () => refs.get(ref) as unknown as ValueGateway<unknown> | null;
	return valueGateway<unknown>({
		id: id ?? `ref:${ref}`,
		handlers: {
			get: () => refs.read(ref),
			update: (next: unknown) => target()?.update?.(next) ?? null,
			remove: () => target()?.remove?.(),
		},
		subscribe: (listener) => refs.watch([ref], listener as () => void),
	});
}

const COLLECTION_WRITES = ["create", "update", "remove", "repairIds"] as const;

type WriteVerb = { (input: never): Promise<unknown>; can(): { can: boolean } };

function delegatedWrites(refs: GatewayRefs, ref: Ref, target: AnyGateway | null) {
	const handlers: Record<string, (input: never) => unknown> = {};
	for (const verb of COLLECTION_WRITES) {
		const held = target?.[verb] as WriteVerb | undefined;
		if (held?.can?.().can !== true) continue;
		handlers[verb] = (input: never) => (refs.get(ref)?.[verb] as WriteVerb | undefined)?.(input) ?? null;
	}
	return handlers;
}

export function refCollection<T>(refs: GatewayRefs, ref: Ref): CollectionGateway<T> {
	const target = refs.get(ref);
	const held = () => refs.get(ref) as unknown as CollectionGateway<T> | null;
	return collectionGateway<T>({
		id: `ref:${ref}?${target?.id ?? ""}`,
		handlers: {
			list: (query: never) => held()?.list?.(query) ?? { rows: [], total: 0 },
			get: (given: never) => held()?.get?.(given) ?? null,
			...delegatedWrites(refs, ref, target),
		},
		subscribe: (listener) => refs.watch([ref], listener as () => void),
	});
}

function identityOf(row: Row<unknown>, named: string): unknown {
	const held = fieldOf(row.value, named);
	if (!isEmpty(held)) return held;
	const aliases = [...new Set([fieldOf(row.value, "id"), fieldOf(row.value, "name")].filter(Boolean))];
	if (aliases.length === 0) return row.ref;
	return aliases.length === 1 ? aliases[0] : aliases;
}

async function rowAt<T>(collection: CollectionGateway<T>, chosen: unknown): Promise<Row<T> | null> {
	if (!chosen) return null;
	try {
		return await collection.get(chosen as Ref);
	} catch {
		return null;
	}
}

export interface SelectionSpec<T> {
	id: string;
	memory: ValueGateway<unknown>;
	collection: CollectionGateway<T>;
	fieldName: string | null | (() => Promise<unknown>);
	isFallbackToFirst: boolean;
	watches?: Subscribe | null;
}

function selectionReader<T>({ memory, collection, fieldName, isFallbackToFirst }: SelectionSpec<T>) {
	const firstRow = async () => (isFallbackToFirst ? (await collection.list()).rows[0] ?? null : null);
	return async () => {
		const named = typeof fieldName === "function" ? await fieldName() : fieldName;
		const chosen = await memory.get();
		if (!named) return chosen ?? (await firstRow())?.ref ?? null;
		const row = (await rowAt(collection, chosen)) ?? (await firstRow());
		return row ? identityOf(row, String(named)) : null;
	};
}

export function selectionGateway<T>(spec: SelectionSpec<T>): ValueGateway<unknown> {
	return valueGateway<unknown>({
		id: spec.id,
		handlers: {
			get: selectionReader(spec),
			update: (ref: unknown) => spec.memory.update(ref),
			remove: () => spec.memory.remove(),
		},
		subscribe: combined([spec.memory.subscribe as Subscribe, spec.collection.subscribe as Subscribe, spec.watches ?? null]),
	});
}
