import type { FilterRow, SortRow } from "../gateway/contract.js";
import { isObject } from "./is-object.js";
import type { HostSpec } from "./host-context.js";
import { fieldsIn } from "../gateway/props.js";
import type { PropConfig } from "../gateway/props.js";

export function whereOf(spec: HostSpec | null | undefined, config: PropConfig | null | undefined): FilterRow[] {
	return [...(spec?.where ?? []), ...filterRowsIn(fieldsIn(config?.fields)["where"])];
}

export function filterRowsIn(held: unknown): FilterRow[] {
	return Array.isArray(held) ? held.filter(isFilterRow) : [];
}

export function sortRowsIn(held: unknown): SortRow[] {
	return Array.isArray(held) ? held.filter(isSortRow) : [];
}

function isFilterRow(held: unknown): held is FilterRow {
	return isObject(held);
}

function isSortRow(held: unknown): held is SortRow {
	return isObject(held) && typeof held["prop"] === "string";
}
