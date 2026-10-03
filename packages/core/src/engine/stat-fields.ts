import type { FilterRow } from "../gateway/contract.js";

export const STAT_ALGORITHMS = [
	"count",
	"sum",
	"average",
	"min",
	"max",
	"percent",
	"active-days",
	"streak",
	"best-streak",
	"record-streak",
	"best-record-streak",
] as const;
export const STAT_WINDOWS = ["all", "today", "7d", "30d", "90d", "365d", "week", "month", "year"] as const;
export const STAT_COMPARISONS = ["none", "change", "change-percent"] as const;

export type StatAlgorithm = (typeof STAT_ALGORITHMS)[number];
export type StatWindow = (typeof STAT_WINDOWS)[number];
export type StatComparison = (typeof STAT_COMPARISONS)[number];

export const ALGORITHMS_READING_A_FIELD: readonly StatAlgorithm[] = ["sum", "average", "min", "max"];

export interface StatQuery {
	algorithm?: string;
	field?: string;
	date?: string;
	window?: string;
	compare?: string;
	counts?: FilterRow[];
}

export const DEFAULT_DATE_FIELD = "date";
