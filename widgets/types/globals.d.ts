declare const h: (type: unknown, props?: unknown, ...children: unknown[]) => any;
declare const Fragment: any;

// TODO: type the kit; every import through widgetarium/kit is any until then
declare module "widgetarium/kit";
declare module "widgetarium/kit/emojis";
declare module "@core/lib";
declare module "@inline/lib";

declare module "@habit/lib" {
	import type { CollectionGateway } from "widgetarium";

	export type HabitNote = {
		ref?: string;
		path?: string;
		name?: string;
		date?: unknown;
		done?: unknown;
		days?: unknown;
	};

	export type LogEntry = { date: string; value: number; path?: string; name?: string };

	export type Streak = { current: number; best: number; last: string | null };

	export const FLAME: string;

	export function isoOf(date: Date): string;
	export function dayOf(iso: string): number;
	export function shiftedBy(iso: string, days: number): string;
	export function shapeOf(rows: HabitNote[] | null | undefined): "habit" | "day";
	export function readLog(rows: HabitNote[] | null | undefined, options?: { pick?: string }): LogEntry[];
	export function streakOf(log: { date: string }[] | null | undefined, options?: { maxGap?: number; today?: string }): Streak;

	export function daysLogged(notes: HabitNote[] | null | undefined): {
		noteByDay: Map<string, HabitNote>;
		keptDays: Set<string>;
	};

	export function pressing(held: {
		days: CollectionGateway<any, any>;
		noteByDay: Map<string, HabitNote>;
		keptDays: Set<string>;
	}): (day: string) => Promise<unknown>;
}

declare module "@task/lib" {
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

	export function columnsOf(board: Board | null | undefined): BoardColumn[];
	export function shownColumnsOf(columns: BoardColumn[]): string[];
	export function archivedColumnsOf(columns: BoardColumn[]): string[];
	export function columnsWritten(columns: BoardColumn[]): WrittenColumns;
	export function propertiesOf(board: Board | null | undefined): string[];

	export const archived: (column: BoardColumn) => BoardColumn;
	export const restored: (column: BoardColumn) => BoardColumn;
	export const columnPatched: (columns: BoardColumn[], name: string, step: (column: BoardColumn) => BoardColumn) => BoardColumn[];
}
