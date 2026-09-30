import type { CanResult, CollectionGateway, RecordRef, Row, ValueGateway } from "./contract";
import type { EveryValueVerb } from "./needs";
import { canDo, valueGateway } from "./create";
import { fieldOf } from "./match";
import { isEmpty } from "./narrow";
import { combineSubscribes } from "./combined";
import type { Subscribe } from "./combined";

export interface SelectionSpec<T> {
	id: string;
	memory: ValueGateway<unknown, EveryValueVerb>;
	collection: CollectionGateway<T>;
	fieldName: string | null | (() => unknown);
	isFallbackToFirst: boolean;
	watches?: Subscribe | null;
}

export function selectionGateway<T>(spec: SelectionSpec<T>): ValueGateway<unknown, EveryValueVerb> {
	return valueGateway<unknown>({
		id: spec.id,
		handlers: {
			get: selectionReader(spec),
			update: (ref: unknown) => spec.memory.update(ref),
			remove: () => spec.memory.remove(),
		},
		subscribe: combineSubscribes([
			spec.memory.subscribe as Subscribe,
			spec.collection.subscribe as Subscribe,
			spec.watches ?? null,
		]),
	});
}

export interface PickSpec<T> {
	id: string;
	chosen: ValueGateway<unknown, EveryValueVerb>;
	collection: CollectionGateway<T>;
	fieldName: string | null | (() => unknown);
	isFallbackToFirst: boolean;
	inTile?: ValueGateway<unknown, EveryValueVerb> | null;
	watches?: Subscribe | null;
}

const NOTHING_TO_WRITE = "Neither the row this names nor the tile behind it can be written to.";
const NO_ROW_OF_ITS_OWN =
	"This names no row of the collection, and the collection is not empty, so the tile behind it is not what a write means here.";

type Cell = ValueGateway<unknown, EveryValueVerb>;
type WriteHome<T> = { row: Row<T> } | { cell: Cell } | { refused: string };

interface WriteHomeAnswer<T> {
	can(): CanResult;
	found(): Promise<WriteHome<T>>;
}

export function createPickedGateway<T>(spec: PickSpec<T>): ValueGateway<unknown, EveryValueVerb> {
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
			...createPickedWrites(spec, home),
		},
		subscribe: combineSubscribes([
			spec.chosen.subscribe as Subscribe,
			spec.collection.subscribe as Subscribe,
			(spec.inTile?.subscribe ?? null) as Subscribe | null,
			spec.watches ?? null,
		]),
	});
}

export function pickedValue(chosen: unknown): string {
	const held = Array.isArray(chosen) ? chosen[0] : chosen;
	return held === undefined || held === null ? "" : String(held);
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
		return await collection.get(chosen as RecordRef);
	} catch {
		return null;
	}
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

function isRowNamed(row: Row<unknown>, named: string, want: string): boolean {
	const held = identityOf(row, named);
	const names = Array.isArray(held) ? held : [held];
	return names.some((name) => String(name ?? "") === want);
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

async function writeInto<T>(spec: PickSpec<T>, home: WriteHome<T>, patch: never): Promise<unknown> {
	if ("refused" in home) throw new Error(home.refused);
	if ("row" in home) return spec.collection.update({ ref: home.row.ref, data: patch as Partial<T> });
	const held = await home.cell.get();
	return home.cell.update({ ...(isHeldRecord(held) ? held : {}), ...(patch as Record<string, unknown>) });
}

// TRADE-OFF: the verb always exists and `cans.update` carries the live answer, because deciding at construction whether a write has anywhere to go is what made a ref-picked write silently do nothing on the first render
function createPickedWrites<T>(spec: PickSpec<T>, home: WriteHomeAnswer<T>): Record<string, (input: never) => unknown> {
	return { update: async (patch: never) => writeInto(spec, await home.found(), patch) };
}
