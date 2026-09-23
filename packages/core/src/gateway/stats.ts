import type { CollectionGateway, FilterRow, ValueGateway } from "./contract";
import type { EveryValueVerb } from "./needs";
import { valueGateway, valueIn } from "./create";
import { stableKey } from "./cache";
import { isMatch, valueOf } from "./match";

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

interface Occurrence {
	day: number | null;
	record: unknown;
}

interface Span {
	from: number;
	to: number;
}

const DAY_MS = 86400000;
const A_DAY = /\d{4}-\d{2}-\d{2}/;
const ROLLING_DAYS: Partial<Record<StatWindow, number>> = { today: 1, "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

export const DEFAULT_DATE_FIELD = "date";

export function todayIso(now: Date = new Date()): string {
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

export function statOf(records: readonly unknown[], query: StatQuery, today: string): number | null {
	const occurrences = occurrencesOf(records, query.date || DEFAULT_DATE_FIELD);
	const now = dayNumberOf(today) ?? 0;
	const window = oneOf(STAT_WINDOWS, query.window, "all");
	const span = spanOf(window, now);
	const current = readingIn(occurrences, query, span, now);
	const comparison = oneOf(STAT_COMPARISONS, query.compare, "none");
	if (comparison === "none") return current;
	const previous = span ? previousSpanOf(window, span) : null;
	if (!previous) return null;
	return comparedWith(current, readingIn(occurrences, query, previous, previous.to), comparison);
}

export function statGateway(
	base: CollectionGateway<unknown>,
	query: StatQuery,
): ValueGateway<number | null, EveryValueVerb> {
	return valueGateway<number | null>({
		id: `stat:${base.id}?${stableKey(query)}`,
		handlers: {
			get: async () => {
				const { rows } = await base.list();
				return statOf(rows.map(valueIn), query, todayIso());
			},
		},
		subscribe: base.subscribe,
	});
}

function oneOf<T extends string>(allowed: readonly T[], asked: unknown, fallback: T): T {
	return typeof asked === "string" && (allowed as readonly string[]).includes(asked) ? (asked as T) : fallback;
}

function dayNumberOf(held: unknown): number | null {
	const written = A_DAY.exec(String(held ?? ""))?.[0];
	return written ? Math.floor(Date.parse(`${written}T00:00:00Z`) / DAY_MS) : null;
}

function occurrencesOf(records: readonly unknown[], dateField: string): Occurrence[] {
	return records.flatMap((record): Occurrence[] => {
		const held = valueOf(record, dateField);
		const days = (Array.isArray(held) ? held : [held]).map(dayNumberOf).filter((day) => day !== null);
		if (days.length === 0) return [{ day: null, record }];
		return days.map((day) => ({ day, record }));
	});
}

function startOfPeriod(window: StatWindow, day: number): number {
	const date = new Date(day * DAY_MS);
	if (window === "week") return day - ((date.getUTCDay() + 6) % 7);
	if (window === "month") return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / DAY_MS);
	return Math.floor(Date.UTC(date.getUTCFullYear(), 0, 1) / DAY_MS);
}

function spanOf(window: StatWindow, now: number): Span | null {
	if (window === "all") return null;
	const rolling = ROLLING_DAYS[window];
	if (rolling) return { from: now - rolling + 1, to: now };
	return { from: startOfPeriod(window, now), to: now };
}

function previousSpanOf(window: StatWindow, span: Span): Span {
	const length = span.to - span.from;
	if (ROLLING_DAYS[window]) return { from: span.from - length - 1, to: span.from - 1 };
	const from = startOfPeriod(window, span.from - 1);
	return { from, to: Math.min(from + length, span.from - 1) };
}

function readingIn(occurrences: Occurrence[], query: StatQuery, span: Span | null, end: number): number | null {
	const inside = span
		? occurrences.filter((held) => held.day !== null && held.day >= span.from && held.day <= span.to)
		: occurrences;
	const counted = inside.filter((held) => isMatch(held.record, query.counts));
	const algorithm = oneOf(STAT_ALGORITHMS, query.algorithm, "count");
	const reading = READINGS[algorithm]({ inside, counted, field: query.field ?? "", span, end });
	return reading === null ? null : roundedOf(reading);
}

interface ReadingInput {
	inside: Occurrence[];
	counted: Occurrence[];
	field: string;
	span: Span | null;
	end: number;
}

const READINGS: Record<StatAlgorithm, (input: ReadingInput) => number | null> = {
	count: ({ counted }) => counted.length,
	sum: ({ counted, field }) => numbersOf(counted, field).reduce((total, one) => total + one, 0),
	average: ({ counted, field }) => averageOf(numbersOf(counted, field)),
	min: ({ counted, field }) => extremeOf(numbersOf(counted, field), Math.min),
	max: ({ counted, field }) => extremeOf(numbersOf(counted, field), Math.max),
	percent: ({ inside, counted }) => shareOf(counted.length, inside.length),
	"active-days": ({ counted, span, end }) => shareOf(daysOf(counted).length, daysAcross(span, counted, end)),
	streak: ({ counted, end }) => currentRunOf(daysOf(counted), end),
	"best-streak": ({ counted }) => longestRunOf(daysOf(counted)),
	"record-streak": ({ inside, counted }) => trailingMatchesOf(inside, counted),
	"best-record-streak": ({ inside, counted }) => longestMatchesOf(inside, counted),
};

function numbersOf(occurrences: Occurrence[], field: string): number[] {
	return occurrences.map((held) => Number(valueOf(held.record, field))).filter((one) => Number.isFinite(one));
}

function averageOf(numbers: number[]): number | null {
	if (numbers.length === 0) return null;
	return numbers.reduce((total, one) => total + one, 0) / numbers.length;
}

function extremeOf(numbers: number[], pick: (...values: number[]) => number): number | null {
	return numbers.length === 0 ? null : pick(...numbers);
}

function shareOf(part: number, whole: number): number | null {
	return whole > 0 ? (part / whole) * 100 : null;
}

function daysOf(occurrences: Occurrence[]): number[] {
	const days = occurrences.map((held) => held.day).filter((day) => day !== null);
	return [...new Set(days)].sort((first, second) => first - second);
}

function daysAcross(span: Span | null, counted: Occurrence[], end: number): number {
	if (span) return span.to - span.from + 1;
	const first = daysOf(counted)[0];
	return first === undefined ? 0 : end - first + 1;
}

function currentRunOf(days: number[], end: number): number {
	const last = days[days.length - 1];
	if (last === undefined || end - last > 1) return 0;
	let run = 1;
	for (let at = days.length - 1; at > 0 && days[at]! - days[at - 1]! === 1; at -= 1) run += 1;
	return run;
}

function longestRunOf(days: number[]): number {
	let best = days.length > 0 ? 1 : 0;
	let run = 1;
	for (let at = 1; at < days.length; at += 1) {
		run = days[at]! - days[at - 1]! === 1 ? run + 1 : 1;
		best = Math.max(best, run);
	}
	return best;
}

function inOrder(occurrences: Occurrence[]): Occurrence[] {
	return [...occurrences].sort((first, second) => (first.day ?? 0) - (second.day ?? 0));
}

function trailingMatchesOf(inside: Occurrence[], counted: Occurrence[]): number {
	const kept = new Set(counted);
	const ordered = inOrder(inside);
	let run = 0;
	for (let at = ordered.length - 1; at >= 0 && kept.has(ordered[at]!); at -= 1) run += 1;
	return run;
}

function longestMatchesOf(inside: Occurrence[], counted: Occurrence[]): number {
	const kept = new Set(counted);
	let best = 0;
	let run = 0;
	for (const held of inOrder(inside)) {
		run = kept.has(held) ? run + 1 : 0;
		best = Math.max(best, run);
	}
	return best;
}

function comparedWith(current: number | null, previous: number | null, comparison: StatComparison): number | null {
	if (current === null || previous === null) return null;
	if (comparison === "change") return roundedOf(current - previous);
	if (previous === 0) return null;
	return roundedOf(((current - previous) / Math.abs(previous)) * 100);
}

function roundedOf(value: number): number {
	return Math.round(value * 10) / 10;
}
