import type { WordChoice } from "../utils/surface";

export type ColumnType = "text" | "number" | "date";

export type SortDirection = "asc" | "desc";

export const COLUMN_TYPES: readonly ColumnType[] = ["text", "number", "date"];

export const COLUMN_TYPE_WORD: WordChoice<ColumnType> = {
	kind: "column type",
	allowed: COLUMN_TYPES,
	fallback: "text",
};

export const ALIGNED_TO_THE_END: readonly ColumnType[] = ["number", "date"];

export const LOADING_ROWS = 5;

export const BLANK_CELL = "—";

export const NOTHING_HERE = "Nothing here yet.";

export const SORT_ICONS: Readonly<Record<SortDirection | "none", string>> = {
	asc: "chevron-up",
	desc: "chevron-down",
	none: "chevrons-up-down",
};

export const SPOKEN_SORT: Readonly<Record<SortDirection, "ascending" | "descending">> = {
	asc: "ascending",
	desc: "descending",
};
