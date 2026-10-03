import { applyQuery, collectionGateway, rowOf, toRows, valueGateway, valueIn } from "./create";
import type { CollectionGateway, Query, Row, RowsResult, ValueGateway } from "./contract";
import type { EveryValueVerb } from "./needs";

type Held<T> = T | null | undefined;

export type StoredRow = Row<unknown>;

export interface HardcodeOptions {
	readonly id: string;
	readonly readValue: () => unknown;
	readonly mutateValue: (step: (stored: unknown) => unknown) => void;
	readonly requested?: readonly string[];
}

type RowsStep = (rows: readonly StoredRow[]) => readonly StoredRow[];

type RowsWrite = (step: RowsStep) => void;

interface RowPatch {
	readonly ref: string;
	readonly data?: unknown;
}

export function storedRows(stored: unknown): StoredRow[] {
	return toRows<unknown>(configRows(stored), "id");
}

export function hardcodeCollection({
	id,
	readValue,
	mutateValue,
	requested = [],
}: HardcodeOptions): CollectionGateway<unknown> {
	const rowsNow = (): StoredRow[] => storedRows(readValue());
	const write: RowsWrite = (step) => mutateValue((stored) => wrapRows(step(storedRows(stored))));
	return collectionGateway({
		id,
		requested: [...requested],
		settlesNow: true,
		handlers: { ...hardcodeReads(rowsNow), ...hardcodeWrites(write) },
	});
}

export function hardcodeValue({
	id,
	readValue,
	mutateValue,
	requested = [],
}: HardcodeOptions): ValueGateway<unknown, EveryValueVerb> {
	return valueGateway({
		id,
		requested: [...requested],
		settlesNow: true,
		handlers: {
			get: () => readValue() ?? null,
			update: (next: unknown) => {
				mutateValue(() => next);
				return next;
			},
		},
	});
}

const mintRef = (): string => `r${Math.random().toString(36).slice(2, 10)}`;

const hasRef = (row: unknown): row is StoredRow =>
	typeof row === "object" && row !== null && "ref" in row && Boolean(row.ref);

function configRows(stored: unknown): readonly unknown[] {
	return Array.isArray(stored) ? stored : [];
}

// TRADE-OFF: an index ref becomes the stored id — minting one on a read is a write nobody asked for
function wrapRows(rows: readonly StoredRow[]): { id: string; value: unknown }[] {
	return rows.map((row) => ({ id: row.ref, value: valueIn(row) }));
}

function flattenProps(data: unknown): unknown {
	return isPlain(data) ? flattenPlain(data) : data;
}

function flattenPlain(data: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
	const { props, ...rest } = data;
	return isPlain(props) ? { ...rest, ...props } : rest;
}

function patchValue(value: unknown, data: unknown): unknown {
	if (!isPlain(value) || !isPlain(data)) return flattenProps(data);
	return { ...value, ...flattenPlain(data) };
}

function updateStoredRow(write: RowsWrite, { ref, data }: RowPatch): StoredRow | null {
	let next: StoredRow | null = null;
	write((rows) =>
		rows.map((row) => {
			if (row.ref !== ref) return row;
			const patched = rowOf<unknown>(patchValue(valueIn(row), data), ref);
			next = patched;
			return patched;
		}),
	);
	return next;
}

const withMintedRef = (row: unknown): StoredRow => (hasRef(row) ? row : rowOf<unknown>(row, mintRef()));

function hardcodeWrites(write: RowsWrite): {
	create: (draft: unknown) => StoredRow;
	update: (input: RowPatch) => StoredRow | null;
	remove: (ref: string) => void;
	replace: (rows: Held<readonly unknown[]>) => void;
} {
	return {
		create: (draft) => {
			const row = rowOf<unknown>(flattenProps(draft), mintRef());
			write((rows) => [...rows, row]);
			return row;
		},
		update: (input) => updateStoredRow(write, input),
		remove: (ref) => {
			write((rows) => rows.filter((row) => row.ref !== ref));
		},
		replace: (rows) => {
			write(() => (rows ?? []).map(withMintedRef));
		},
	};
}

function hardcodeReads(rowsNow: () => StoredRow[]): {
	list: (query: Query | void) => RowsResult<unknown>;
	get: (ref: string) => StoredRow | null;
} {
	return {
		list: (query) => applyQuery(rowsNow(), query),
		get: (ref) => rowsNow().find((row) => row.ref === ref) ?? null,
	};
}

const isPlain = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
