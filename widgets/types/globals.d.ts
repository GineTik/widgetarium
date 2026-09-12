declare const h: (type: unknown, props?: unknown, ...children: unknown[]) => any;
declare const Fragment: any;

declare module "react-dom" {
	import type { ReactNode } from "react";
	export function createPortal(children: ReactNode, container: Element): ReactNode;
}

// TODO: type the kit; every import through widgetarium/kit is any until then
declare module "widgetarium/kit";
declare module "widgetarium/kit/emojis";
declare module "@core/lib";
declare module "@inline/lib";

declare module "@rank/lib" {
	export type RankTier = { label: string; tone?: string; order?: number };

	export type RankCard = { name: string; tier?: string; order?: number; picture?: string };

	export type Held<T> = { ref: string; value: T };

	export type Picture =
		| { kind: "letters"; letters: string }
		| { kind: "emoji"; name: string; letters: string }
		| { kind: "remote"; src: string; letters: string }
		| { kind: "vault"; markdown: string; letters: string };

	export type Preset = { id: string; name: string; needsTheWeb?: boolean; credit?: string; cards: RankCard[] };

	export const DEFAULT_TIERS: RankTier[];
	export const PRESETS: Preset[];

	export function labelOf(tier: unknown): string;
	export function toneOf(tier: unknown): string;
	export function nameOf(card: unknown): string;
	export function pictureOf(card: unknown): Picture;
	export function toneForSeed(seed: unknown): string;
	export function cardSizeOf(value: unknown): number;
	export function isLabelTaken(taken: string[], label: string): boolean;
	export function freeLabel(taken: string[]): string;
	export function nextToneAfter(tone: string): string;
	export function rowsOf<T>(values: readonly T[]): Held<T>[];

	export function rackOf<T, C>(
		tierRows: Held<T>[],
		cardRows: Held<C>[],
	): { tiers: Held<T>[]; rack: { row: Held<T>; label: string; tone: string; cards: Held<C>[] }[]; tray: Held<C>[]; orphans: Held<C>[]; ranked: number };

	export function placedAt<T extends { ref: string }>(rows: T[], moved: T, at: number): T[];
	export function orderBetween(above: { value: unknown } | null, below: { value: unknown } | null): number | null;
	export function renumbered<T extends { ref: string; value: unknown }>(rows: T[]): { ref: string; value: { order: number } & Record<string, unknown> }[];
}

declare module "@default/lib" {
	export type MetricPoint = { day: string; value: number; isLogged: boolean };

	export type MetricTone = "up" | "down" | "flat";

	export type MetricSummary = {
		points: MetricPoint[];
		total: number;
		today: number;
		change: number;
		percent: number | null;
		tone: MetricTone;
		peak: number | null;
		low: number | null;
		avg: number;
		floor: number;
		ceiling: number;
		undated: number;
		unreadable: number;
		ahead: number;
	};

	export type MetricDraft = { date: string; amount: number; note?: string };

	export type MetricSpan = { floor: number; ceiling: number };

	export type ChartBox = { width: number; height: number; headRoom: number; barShare: number; bleed: number };

	export type MetricBar = { day: string; x: number; y: number; width: number; height: number; rx: number };

	export type MetricPlate = { label: string; value: string; isTone: boolean; isWide: boolean };

	export type RecordWriter = { create: (draft: Record<string, unknown>) => Promise<unknown> };

	export function isoOf(date: Date): string;
	export function shiftedBy(iso: string, days: number): string;
	export function dayOfRecord(record: unknown): string | null;
	export function amountOf(record: unknown): number | null;
	export function summarize(records: readonly unknown[], days: number, today: string, rising: string): MetricSummary;
	export function keyOf(draft: MetricDraft): string;
	export function formatCompact(value: number): string;
	export function formatPercent(percent: number): string;
	export function formatSigned(value: number): string;
	export function readableDay(iso: string): string;
	export function pathThrough(spots: readonly { x: number; y: number }[]): string;
	export function areaUnder(spots: readonly { x: number; y: number }[], base: number): string;
	export function spotsOf(points: readonly MetricPoint[], span: MetricSpan, box: ChartBox): { x: number; y: number }[];
	export function barsOf(points: readonly MetricPoint[], span: MetricSpan, box: ChartBox): MetricBar[];
	export function baselineOf(span: MetricSpan, box: ChartBox): number;
	export function writeDraft(records: RecordWriter, draft: { date: string; amount: string; note: string }): Promise<string>;
	export function platesOf(summary: MetricSummary): MetricPlate[];
	export function leftOutLine(summary: MetricSummary): string;
	export function tipShare(hovered: number, count: number): number;
	export function emptyDraft(today: string): { date: string; sign: string; amount: string; note: string };
	export function dateOf(iso: string): Date;
}

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
