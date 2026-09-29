import type { CanResult, CollectionGateway, FilterRow, GatewayBase, Unsubscribe, ValueGateway } from "./contract";
import type { EveryValueVerb } from "./needs";

type PropRef = string;
import { collectionGateway, valueGateway } from "./create";
import type { Narrowing } from "./narrow";
import { isEmpty, narrowCollection, normalizeWhere } from "./narrow";
import { combineSubscribes } from "./combined";
import type { Subscribe } from "./combined";

export type AnyGateway = GatewayBase & Record<string, unknown>;
export type { Subscribe } from "./combined";
export { createPickedGateway, pickedValue, selectionGateway } from "./picked";
export type { PickSpec, SelectionSpec } from "./picked";

export interface RefDescription {
	ref?: PropRef;
	tile: string;
	prop: string;
	label: string;
	title: string;
	kind: string;
	shape?: string;
}

export interface GatewayRefs {
	put(ref: PropRef, gateway: AnyGateway | null, told?: { describes?: RefDescription; dependsOn?: PropRef[] }): void;
	drop(ref: PropRef, gateway?: AnyGateway | null): void;
	read(ref: PropRef): Promise<unknown>;
	watch(refs: PropRef[], listener: () => void): Unsubscribe;
	get(ref: PropRef): AnyGateway | null;
	offered(): RefDescription[];
	subscribe(listener: () => void): Unsubscribe;
}

interface RefsState {
	held: Map<PropRef, AnyGateway>;
	described: Map<PropRef, RefDescription>;
	listeners: Set<() => void>;
	depends: Map<PropRef, PropRef[]>;
	isQueued: boolean;
}

export const refOf = (tileId: string, name: string): PropRef => `${tileId}/${name}`;

type Reader = { get?: { (): Promise<unknown>; can(): { can: boolean } } };

export function createViewCells(): (key: string) => ValueGateway<unknown, EveryValueVerb> {
	const cells = new Map<string, ValueGateway<unknown, EveryValueVerb>>();
	return (key) => {
		if (!cells.has(key)) cells.set(key, memoryCell(key));
		return cells.get(key) as ValueGateway<unknown, EveryValueVerb>;
	};
}

export function createGatewayRefs(): GatewayRefs {
	const state: RefsState = {
		held: new Map(),
		described: new Map(),
		listeners: new Set(),
		depends: new Map(),
		isQueued: false,
	};
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

export function refsWithin(rows: FilterRow[] | null | undefined): PropRef[] {
	return (rows ?? []).map(refIn).filter(Boolean) as PropRef[];
}

const NOT_A_NARROWING =
	'Widgetarium: "{ref}" answered with something no condition can be made of, so it narrows nothing.';

export async function resolveWhere(rows: FilterRow[], refs: GatewayRefs): Promise<FilterRow[]> {
	const out: FilterRow[] = [];
	for (const row of rows) out.push(...(await resolveRow(row, refs)));
	return out;
}

export function narrowByRefs<T>(
	base: CollectionGateway<T>,
	rows: FilterRow[] | null | undefined,
	refs: GatewayRefs,
): CollectionGateway<T> {
	const held = rows ?? [];
	const named = refsWithin(held);
	return narrowCollection<T>(
		base,
		held,
		(asked) => resolveWhere(asked, refs),
		combineSubscribes([
			base.subscribe,
			named.length > 0 ? (((listener) => refs.watch(named, listener as () => void)) as Subscribe) : null,
		]),
	);
}

export function refValue(refs: GatewayRefs, ref: PropRef, id?: string): ValueGateway<unknown, EveryValueVerb> {
	const target = () => refs.get(ref) as unknown as ValueGateway<unknown, EveryValueVerb> | null;
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

const COLLECTION_WRITES = ["create", "update", "remove", "replace", "repairIds"] as const;

type WriteVerb = { (input: never): Promise<unknown>; can(): CanResult };

const NOTHING_PUBLISHED = "Nothing is published at {ref} yet, so it cannot be written to.";

export function refCollection<T>(refs: GatewayRefs, ref: PropRef): CollectionGateway<T> {
	const target = refs.get(ref);
	const held = () => refs.get(ref) as unknown as CollectionGateway<T> | null;
	const writes = delegateWrites(refs, ref);
	return collectionGateway<T>({
		id: `ref:${ref}?${target?.id ?? ""}`,
		cans: writes.cans,
		handlers: {
			list: (query: never) => held()?.list?.(query) ?? { rows: [], total: 0 },
			get: (given: never) => held()?.get?.(given) ?? null,
			...writes.handlers,
		},
		subscribe: (listener) => refs.watch([ref], listener as () => void),
	});
}

function notify(state: RefsState) {
	if (state.isQueued) return;
	state.isQueued = true;
	queueMicrotask(() => {
		state.isQueued = false;
		for (const listener of [...state.listeners]) listener();
	});
}

function put(
	state: RefsState,
	ref: PropRef,
	gateway: AnyGateway | null,
	told?: { describes?: RefDescription; dependsOn?: PropRef[] },
) {
	const before = state.held.get(ref);
	if (gateway) state.held.set(ref, gateway);
	else state.held.delete(ref);
	if (told?.describes) state.described.set(ref, { ...told.describes, ref });
	state.depends.set(ref, told?.dependsOn ?? []);
	if (before?.id !== gateway?.id) notify(state);
}

function drop(state: RefsState, ref: PropRef, gateway?: AnyGateway | null) {
	if (gateway && state.held.get(ref) !== gateway) return;
	if (!state.held.has(ref) && !state.described.has(ref)) return;
	state.held.delete(ref);
	state.described.delete(ref);
	state.depends.delete(ref);
	notify(state);
}

function loops(state: RefsState, from: PropRef): boolean {
	const seen = new Set<PropRef>();
	const walk = (ref: PropRef): boolean => {
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

function watch(state: RefsState, refs: PropRef[], listener: () => void): Unsubscribe {
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

function answers(gateway: AnyGateway | undefined): boolean {
	const read = (gateway as Reader | undefined)?.get;
	return typeof read === "function" && read.can().can !== false;
}

async function read(state: RefsState, ref: PropRef): Promise<unknown> {
	const gateway = state.held.get(ref);
	if (!answers(gateway)) return null;
	if (loops(state, ref)) {
		console.warn(`Widgetarium: "${ref}" reads its own answer back — the loop is cut here`);
		return null;
	}
	return (gateway as unknown as ValueGateway<unknown, EveryValueVerb>).get();
}

function memoryCell(key: string): ValueGateway<unknown, EveryValueVerb> {
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

function isUnwired(held: unknown): boolean {
	return (
		typeof held === "object" &&
		held !== null &&
		typeof (held as { wants?: unknown }).wants === "string" &&
		typeof (held as { ref?: unknown }).ref !== "string"
	);
}

function refIn(row: FilterRow | null | undefined): PropRef | null {
	const named = row?.spread?.ref ?? (row?.value as { ref?: unknown } | undefined)?.ref;
	return typeof named === "string" ? named : null;
}

function isNarrowing(chosen: unknown): chosen is Narrowing {
	return Array.isArray(chosen) || (typeof chosen === "object" && chosen !== null);
}

function spreadClauses(chosen: unknown, by: PropRef): FilterRow[] {
	if (isEmpty(chosen)) return [];
	if (isNarrowing(chosen)) return normalizeWhere(chosen, by);
	console.warn(NOT_A_NARROWING.replace("{ref}", by));
	return [];
}

function clausesOn(row: FilterRow, chosen: unknown, by: PropRef): FilterRow[] {
	if (isEmpty(chosen)) return [];
	if (!Array.isArray(chosen)) return [{ ...row, value: chosen, by }];
	if (!row.prop) return [{ op: "in", value: chosen, by }];
	return [{ prop: row.prop, op: "in", value: chosen, by }];
}

async function resolveRow(row: FilterRow, refs: GatewayRefs): Promise<FilterRow[]> {
	if (isUnwired(row?.spread) || isUnwired(row?.value)) return [];
	const spread = row?.spread?.ref;
	if (typeof spread === "string") return spreadClauses(await refs.read(spread), spread);
	const named = refIn(row);
	if (!named) return [row];
	return clausesOn(row, await refs.read(named), named);
}

function delegateWrites(refs: GatewayRefs, ref: PropRef) {
	const handlers: Record<string, (input: never) => unknown> = {};
	const cans: Record<string, () => CanResult> = {};
	const refused = { can: false as const, reason: NOTHING_PUBLISHED.replace("{ref}", ref) };
	for (const verb of COLLECTION_WRITES) {
		const live = (): WriteVerb | null => {
			const held = refs.get(ref)?.[verb];
			return typeof held === "function" ? (held as WriteVerb) : null;
		};
		handlers[verb] = (input: never) => {
			const held = live();
			if (!held) throw new Error(refused.reason);
			return held(input);
		};
		cans[verb] = () => {
			const held = live();
			return held && typeof held.can === "function" ? held.can() : refused;
		};
	}
	return { handlers, cans };
}
