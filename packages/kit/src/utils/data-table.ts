import { ALIGNED_TO_THE_END, BLANK_CELL, COLUMN_TYPE_WORD } from "../constants/data-table";
import type { SortDirection } from "../constants/data-table";
import { wornWord } from "./surface";

export type SortOrder = { readonly key: string; readonly direction: SortDirection } | null;

export type ColumnAlign = "start" | "end";

export interface DataColumn {
	readonly key: string;
	readonly label?: unknown;
	readonly type?: string | undefined;
	readonly align?: ColumnAlign | undefined;
	readonly sortable?: boolean | undefined;
}

export type DataRow = Readonly<Record<string, unknown>>;

export function nextSort(sort: SortOrder, key: string): SortOrder {
	if (sort?.key === key && sort.direction === "asc") return { key, direction: "desc" };
	return { key, direction: "asc" };
}

export function alignOf(column: DataColumn): ColumnAlign {
	if (column.align === "start" || column.align === "end") return column.align;
	return ALIGNED_TO_THE_END.includes(wornWord(column.type, COLUMN_TYPE_WORD)) ? "end" : "start";
}

export function cellText(held: unknown): string {
	if (held === undefined || held === null || held === "") return BLANK_CELL;
	if (typeof held === "number") return held.toLocaleString();
	return String(held);
}

export function keyOfRow(row: DataRow | null | undefined, index: number): string {
	const held = row?.["ref"] ?? row?.["id"];
	return held === undefined || held === null ? String(index) : String(held);
}
