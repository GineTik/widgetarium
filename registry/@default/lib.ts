import { fieldOf } from "widgetarium";
import type { RecordRef } from "widgetarium";

export type HabitNote = {
	ref?: RecordRef;
	path?: string;
	name?: string;
	date?: unknown;
	done?: unknown;
	days?: unknown;
};

export type LogEntry = { date: string; value: number; path?: string | undefined; name?: string | undefined };

export type Streak = { current: number; best: number; last: string | null };

export type StreakOptions = { maxGap?: number; today?: string };

export type DaysLogged<Note extends HabitNote> = { noteByDay: Map<string, Note>; keptDays: Set<string> };

export type DayWriter = {
	update(input: { ref: RecordRef; data: { done: number | null } }): Promise<unknown>;
	create(draft: { name: string; props: { done: number } }): Promise<unknown>;
};

export type BoardColumn = { name: string; archivedAt?: string | null; isArchived?: boolean };

export type Board = {
	path?: string;
	name?: string;
	props?: Record<string, unknown>;
	columns?: unknown;
	archivedColumns?: unknown;
	properties?: unknown;
};

export type WrittenColumns = { columns: { name: string; archivedAt?: string }[]; archivedColumns: string[] };

export const EMOJI_PREFIX = "emoji:";
export const ICON_PREFIX = "icon:";

const A_DAY_IN_TEXT = /\d{4}-\d{2}-\d{2}/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;
const NEVER_A_PROPERTY = ["ref", "path", "name", "props", "widgetarium"];

export function isoOf(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// TRADE-OFF: UTC, while isoOf reads a Date in local time — a date-only shift must not drift over a DST seam
export function shiftedBy(iso: string, days: number): string {
	const when = new Date(Date.parse(`${iso}T00:00:00Z`));
	when.setUTCDate(when.getUTCDate() + days);
	return when.toISOString().slice(0, 10);
}

export function dayOfRecord(record: unknown): string | null {
	return writtenDay(fieldOn(record, "date")) ?? writtenDay(fieldOn(record, "name"));
}

export function numberIn(held: unknown): number | null {
	if (typeof held === "number") return Number.isFinite(held) ? held : null;
	if (typeof held !== "string" || held.trim() === "") return null;
	const read = Number(held);
	return Number.isFinite(read) ? read : null;
}

export function leadDaysOf(firstWeekday: number, isWeekStartingMonday: boolean): number {
	return isWeekStartingMonday ? (firstWeekday + 6) % 7 : firstWeekday;
}

export function shapeOf(rows: readonly HabitNote[] | null | undefined): "habit" | "day" {
	return (rows ?? []).some((row) => Array.isArray(row?.days)) ? "habit" : "day";
}

export function readLog(rows: readonly HabitNote[] | null | undefined, { pick = "" } = {}): LogEntry[] {
	const held = rows ?? [];
	const log = shapeOf(held) === "habit" ? fromHabits(held, pick) : fromDays(held);
	return log.sort((first, second) => (first.date < second.date ? -1 : first.date > second.date ? 1 : 0));
}

export function streakOf(
	log: readonly { date: string }[] | null | undefined,
	{ maxGap: missedDaysARunSurvives = 0, today = "" }: StreakOptions = {},
): Streak {
	const days = [...new Set((log ?? []).map((entry) => entry.date))].sort().map(dayNumberOf);
	const last = days.at(-1);
	if (last === undefined) return { current: 0, best: 0, last: null };

	const reach = missedDaysARunSurvives + 1;
	let best = 1;
	let run = 1;
	for (let at = 1; at < days.length; at += 1) {
		run = gapAt(days, at) <= reach ? run + 1 : 1;
		if (run > best) best = run;
	}

	const now = today ? dayNumberOf(today) : last;
	const isStillInReach = now - last <= reach;
	let current = isStillInReach ? 1 : 0;
	if (isStillInReach) {
		for (let at = days.length - 1; at > 0 && gapAt(days, at) <= reach; at -= 1) current += 1;
	}
	return { current, best, last: isoOf(new Date(last * DAY_MS)) };
}

export function daysLogged<Note extends HabitNote>(notes: readonly Note[] | null | undefined): DaysLogged<Note> {
	const noteByDay = new Map<string, Note>();
	const keptDays = new Set<string>();
	for (const note of notes ?? []) {
		const day = dayOfRecord(note);
		if (!day) continue;
		noteByDay.set(day, note);
		if (note.done != null) keptDays.add(day);
	}
	return { noteByDay, keptDays };
}

// TRADE-OFF: a new note is seeded with the need's own name, because nothing has resolved it yet in a folder with no such property
export function pressing<Note extends HabitNote & { ref: RecordRef }>({
	days,
	noteByDay,
	keptDays,
}: DaysLogged<Note> & { days: DayWriter }): (day: string) => Promise<unknown> {
	return async (day) => {
		const found = noteByDay.get(day);
		if (found) return days.update({ ref: found.ref, data: { done: keptDays.has(day) ? null : 1 } });
		return days.create({ name: day, props: { done: 1 } });
	};
}

export function toTabList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

export function columnsOf(board: Board | null | undefined): BoardColumn[] {
	const rows = namedRows(fieldOf(board, "columns"));
	const archivedLongAgo = new Set(toTabList(fieldOf(board, "archivedColumns")));
	const named = new Set(rows.map((row) => row.name));
	const forgotten = [...archivedLongAgo].filter((name) => !named.has(name)).map((name) => ({ name }));
	const every: { name: string; archivedAt?: unknown }[] = [...rows, ...forgotten];
	return every.map((row) => ({
		name: row.name,
		archivedAt: archivedAtOf(row),
		isArchived: Boolean(row.archivedAt) || archivedLongAgo.has(row.name),
	}));
}

export function shownColumnsOf(columns: readonly BoardColumn[]): string[] {
	return columns.filter((column) => !column.isArchived).map((column) => column.name);
}

export function archivedColumnsOf(columns: readonly BoardColumn[]): string[] {
	return columns.filter((column) => column.isArchived).map((column) => column.name);
}

export function archived(column: BoardColumn): BoardColumn {
	return { ...column, isArchived: true, archivedAt: archivedStamp(column) };
}

export function restored(column: BoardColumn): BoardColumn {
	return { ...column, isArchived: false, archivedAt: null };
}

export function columnPatched(
	columns: readonly BoardColumn[],
	name: string,
	step: (column: BoardColumn) => BoardColumn,
): BoardColumn[] {
	return columns.map((column) => (column.name === name ? step(column) : column));
}

// TRADE-OFF: the old key is emptied, not dropped — processFrontMatter merges and cannot delete
export function columnsWritten(columns: readonly BoardColumn[]): WrittenColumns {
	return {
		columns: columns.map((column) =>
			column.isArchived ? { name: column.name, archivedAt: archivedStamp(column) } : { name: column.name },
		),
		archivedColumns: [],
	};
}

export function askedCount(data: unknown, fallback: number): number {
	const asked = Math.round(Number(data));
	return Number.isFinite(asked) && asked > 0 ? asked : fallback;
}

export function heldValues(record: unknown): Record<string, unknown> {
	if (!isRecord(record)) return {};
	const carried = record["props"];
	return { ...record, ...(isRecord(carried) ? carried : {}) };
}

export function heldProperties(record: unknown): Record<string, unknown> {
	return Object.fromEntries(Object.entries(heldValues(record)).filter(([key]) => !NEVER_A_PROPERTY.includes(key)));
}

function isRecord(held: unknown): held is Record<string, unknown> {
	return typeof held === "object" && held !== null;
}

function fieldOn(record: unknown, key: string): unknown {
	return isRecord(record) ? record[key] : undefined;
}

function writtenDay(held: unknown): string | null {
	return A_DAY_IN_TEXT.exec(String(held ?? ""))?.[0] ?? null;
}

function dayNumberOf(iso: string): number {
	return Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

function gapAt(days: readonly number[], at: number): number {
	return (days[at] ?? 0) - (days[at - 1] ?? 0);
}

function tickCountOf(value: unknown): number {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
}

function fromHabits(rows: readonly HabitNote[], pick: string): LogEntry[] {
	const log: LogEntry[] = [];
	for (const row of rows) {
		if (pick && row.name !== pick) continue;
		for (const date of Array.isArray(row.days) ? row.days : []) {
			if (typeof date === "string" && ISO.test(date)) log.push({ date, value: 1, path: row.path, name: row.name });
		}
	}
	return log;
}

function fromDays(rows: readonly HabitNote[]): LogEntry[] {
	const log: LogEntry[] = [];
	for (const row of rows) {
		const day = dayOfRecord(row);
		if (!day) continue;
		const value = tickCountOf(row.done);
		if (value > 0) log.push({ date: day, value, path: row.path, name: row.name });
	}
	return log;
}

function namedRows(held: unknown): { name: string; archivedAt?: unknown }[] {
	if (typeof held === "string") return toTabList(held).map((name) => ({ name }));
	if (!Array.isArray(held)) return [];
	return held
		.map((entry: unknown) => (typeof entry === "string" ? { name: entry } : isRecord(entry) ? entry : {}))
		.map((row) => ({ ...row, name: String(fieldOn(row, "name") ?? "").trim() }))
		.filter((row) => row.name !== "");
}

function archivedAtOf(row: { archivedAt?: unknown }): string | null {
	return typeof row.archivedAt === "string" ? row.archivedAt : null;
}

function archivedStamp(column: BoardColumn): string {
	return column.archivedAt ?? new Date().toISOString();
}
