import type { DrawnProps, RecordRef } from "widgetarium";
import type { MetricTotal } from "./widget";

export type Tone = "up" | "down" | "flat";
export type Band = "wide" | "mid" | "narrow" | "floor";
export type Point = { day: string; value: number };
export type Spot = { x: number; y: number };

export type Hovered = { at: number; left: number };
export type Draft = { ref: RecordRef | null; day: string; sign: string; amount: string; note: string };

export type Summary = {
	points: Point[];
	balance: Point[];
	total: number;
	today: number;
	percent: number | null;
	direction: Tone;
	tone: Tone;
	peak: number;
	low: number;
	avg: number;
	undated: number;
};

export type ChartBox = {
	width: number;
	height: number;
	headRoom: number;
	footY: number;
	bleed: number;
	inkAt: number;
	inkFar: number;
	underTop: number;
};

export type HeadProps = {
	title: string;
	summary: Summary;
	label: string;
	days: number;
	view: View;
	rows: { ref: RecordRef; label: string }[];
	onView: (picked: View) => void;
	onPeriod: (ref: RecordRef) => void;
};

export type Listed = { ref: RecordRef; day: string; note: string; amount: number };

export type Allowed = { canAdd: boolean; canEdit: boolean; canDelete: boolean };

export type MetricProps = DrawnProps<typeof MetricTotal.declared>;
export type View = MetricProps["view"]["value"];
export type Rising = MetricProps["rising"];
