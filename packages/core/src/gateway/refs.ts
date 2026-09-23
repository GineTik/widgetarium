import type {
	CanResult,
	CollectionGateway,
	FilterRow,
	GatewayBase,
	GatewayEvent,
	Ref,
	Row,
	Unsubscribe,
	ValueGateway,
} from "./contract";
import type { EveryValueVerb } from "./needs";
import { canDo, collectionGateway, valueGateway } from "./create";
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

function put(
	state: RefsState,
	ref: Ref,
	gateway: AnyGateway | null,
	told?: { describes?: RefDescription; dependsOn?: Ref[] },
) {
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

function isUnwired(held: unknown): boolean {
	return (
		typeof held === "object" &&
		held !== null &&
		typeof (held as { wants?: unknown }).wants === "string" &&
		typeof (held as { ref?: unknown }).ref !== "string"
	);
}

function refIn(row: FilterRow | null | undefined): Ref | null {
	const named = row?.spread?.ref ?? (row?.value as { ref?: unknown } | undefined)?.ref;
	return typeof named === "string" ? named : null;
}

export function refsWithin(rows: FilterRow[] | null | undefined): Ref[] {
	return (rows ?? []).map(refIn).filter(Boolean) as Ref[];
}

const NOT_A_NARROWING =
	'Widgetarium: "{ref}" answered with something no condition can be made of, so it narrows nothing.';

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
	if (!row.prop) return [{ op: "in", value: chosen, by }];
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

export function narrowedByRefs<T>(
	base: CollectionGateway<T>,
	rows: FilterRow[] | null | undefined,
	refs: GatewayRefs,
): CollectionGateway<T> {
	const held = rows ?? [];
	const named = refsWithin(held);
	return narrowedCollection<T>(
		base,
		held,
		(asked) => resolveWhere(asked, refs),
		combined([
			base.subscribe,
			named.length > 0 ? (((listener) => refs.watch(named, listener as () => void)) as Subscribe) : null,
		]),
	);
}

export function refValue(refs: GatewayRefs, ref: Ref, id?: string): ValueGateway<unknown, EveryValueVerb> {
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

function delegatedWrites(refs: GatewayRefs, ref: Ref) {
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

export function refCollection<T>(refs: GatewayRefs, ref: Ref): CollectionGateway<T> {
	const target = refs.get(ref);
	const held = () => refs.get(ref) as unknown as CollectionGateway<T> | null;
	const writes = delegatedWrites(refs, ref);
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

function identityOf(row: Row<unknown>, named: string): unknown {
	const held = fieldOf(row, named);
	if (!isEmpty(held)) return held;
	const aliases = [...new Set([fieldOf(row, "id"), fieldOf(row, "name")].filter(Boolean))];
	if (aliases.length === 0) return row.ref;
	return aliases.length === 1 ? aliases[0] : aliases;
}

const isArchivedRow = (row: Row<unknown>): boolean => Boolean(fieldOf(row, "archivedAt"));

const firstStandingRow = <T>(rows: Row<T>[]): Row<T> | null => rows.find((row) => !isArchivedRow(row)) ?? null;

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
	memory: ValueGateway<unknown, EveryValueVerb>;
	collection: CollectionGateway<T>;
	fieldName: string | null | (() => Promise<unknown>);
	isFallbackToFirst: boolean;
	watches?: Subscribe | null;
}

function selectionReader<T>({ memory, collection, fieldName, isFallbackToFirst }: SelectionSpec<T>) {
	const firstRow = async () => (isFallbackToFirst ? firstStandingRow((await collection.list()).rows) : null);
	return async () => {
		const named = typeof fieldName === "function" ? await fieldName() : fieldName;
		const chosen = await memory.get();
		if (!named) return chosen ?? (await firstRow())?.ref ?? null;
		const row = (await rowAt(collection, chosen)) ?? (await firstRow());
		return row ? identityOf(row, String(named)) : null;
	};
}

export function selectionGateway<T>(spec: SelectionSpec<T>): ValueGateway<unknown, EveryValueVerb> {
	return valueGateway<unknown>({
		id: spec.id,
		handlers: {
			get: selectionReader(spec),
			update: (ref: unknown) => spec.memory.update(ref),
			remove: () => spec.memory.remove(),
		},
		subscribe: combined([
			spec.memory.subscribe as Subscribe,
			spec.collection.subscribe as Subscribe,
			spec.watches ?? null,
		]),
	});
}

function isRowNamed(row: Row<unknown>, named: string, want: string): boolean {
	const held = identityOf(row, named);
	const names = Array.isArray(held) ? held : [held];
	return names.some((name) => String(name ?? "") === want);
}

export interface PickSpec<T> {
	id: string;
	chosen: ValueGateway<unknown, EveryValueVerb>;
	collection: CollectionGateway<T>;
	fieldName: string | null | (() => Promise<unknown>);
	isFallbackToFirst: boolean;
	inTile?: ValueGateway<unknown, EveryValueVerb> | null;
	watches?: Subscribe | null;
}

function rowPicker<T>({ chosen, collection, fieldName, isFallbackToFirst }: PickSpec<T>) {
	return async (): Promise<Row<T> | null> => {
		const named = typeof fieldName === "function" ? await fieldName() : fieldName;
		const want = pickedValue(await chosen.get());
		const rows = (await collection.list()).rows;
		const found = rows.find((row) => isRowNamed(row, String(named ?? ""), want));
		return found ?? (isFallbackToFirst ? firstStandingRow(rows) : null);
	};
}

const isHeldRecord = (held: unknown): held is Record<string, unknown> =>
	typeof held === "object" && held !== null && !Array.isArray(held);

const NOTHING_TO_WRITE = "Neither the row this names nor the tile behind it can be written to.";
const NO_ROW_OF_ITS_OWN =
	"This names no row of the collection, and the collection is not empty, so the tile behind it is not what a write means here.";

type Cell = ValueGateway<unknown, EveryValueVerb>;
type WriteHome<T> = { row: Row<T> } | { cell: Cell } | { refused: string };

interface WriteHomeAnswer<T> {
	can(): CanResult;
	found(): Promise<WriteHome<T>>;
}

export function pickedGateway<T>(spec: PickSpec<T>): ValueGateway<unknown, EveryValueVerb> {
	const rowNow = rowPicker(spec);
	const home = writeHomeOf(spec, rowNow);
	return valueGateway<unknown>({
		id: spec.id,
		cans: { update: home.can },
		handlers: {
			get: async () => {
				const row = await rowNow();
				return row ?? spec.inTile?.get() ?? null;
			},
			...pickedWrites(spec, home),
		},
		subscribe: combined([
			spec.chosen.subscribe as Subscribe,
			spec.collection.subscribe as Subscribe,
			(spec.inTile?.subscribe ?? null) as Subscribe | null,
			spec.watches ?? null,
		]),
	});
}

// TRADE-OFF: can() is synchronous and cannot ask whether a row was found, so it answers only whether a side could ever be written and `found` carries the rest as a refusal the write throws
function writeHomeOf<T>(spec: PickSpec<T>, rowNow: () => Promise<Row<T> | null>): WriteHomeAnswer<T> {
	const toRow = () => canDo(spec.collection.update);
	const toCell = () => canDo(spec.inTile?.update);
	return {
		can: (): CanResult => (toRow() || toCell() ? { can: true } : { can: false, reason: NOTHING_TO_WRITE }),
		found: async (): Promise<WriteHome<T>> => {
			const row = toRow() ? await rowNow() : null;
			if (row) return { row };
			if (!toCell()) return { refused: NOTHING_TO_WRITE };
			if ((await spec.collection.list()).total > 0) return { refused: NO_ROW_OF_ITS_OWN };
			return { cell: spec.inTile as Cell };
		},
	};
}

async function writtenInto<T>(spec: PickSpec<T>, home: WriteHome<T>, patch: never): Promise<unknown> {
	if ("refused" in home) throw new Error(home.refused);
	if ("row" in home) return spec.collection.update({ ref: home.row.ref, data: patch as Partial<T> });
	const held = await home.cell.get();
	return home.cell.update({ ...(isHeldRecord(held) ? held : {}), ...(patch as Record<string, unknown>) });
}

// TRADE-OFF: the verb always exists and `cans.update` carries the live answer, because deciding at construction whether a write has anywhere to go is what made a ref-picked write silently do nothing on the first render
function pickedWrites<T>(spec: PickSpec<T>, home: WriteHomeAnswer<T>): Record<string, (input: never) => unknown> {
	return { update: async (patch: never) => writtenInto(spec, await home.found(), patch) };
}
