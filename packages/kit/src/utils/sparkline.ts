import { SPARKLINE_BAR_FLOOR, SPARKLINE_BAR_SHARE, SPARKLINE_DOT_PLACES, SPARKLINE_INSET } from "../constants/charts";
import type { SparklinePlace } from "../constants/charts";
import { isRecord } from "./is-record";
import { wornWord } from "./surface";
import type { WordChoice } from "./surface";

const SPARKLINE_PLACE_WORD: WordChoice<SparklinePlace> = {
	kind: "sparkline place",
	allowed: SPARKLINE_DOT_PLACES,
	fallback: "last",
};

export type SparkSpot = { readonly index: number; readonly value: number; readonly x: number; readonly y: number };

export type SparkBar = {
	readonly index: number;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

export type SparkValues = readonly (number | null)[];

export type SparkSpots = readonly (SparkSpot | null)[];

export function valuesOf(data: unknown, dataKey?: string): (number | null)[] {
	if (!Array.isArray(data)) return [];
	return data.map((entry: unknown) => numberIn(dataKey === undefined ? entry : fieldOf(entry, dataKey)));
}

export function sparkSpots(values: SparkValues, width: number, height: number): (SparkSpot | null)[] {
	const known = values.filter(isKnown);
	const low = Math.min(...known);
	const high = Math.max(...known);
	const across = Math.max(width - 2 * SPARKLINE_INSET, 0);
	const down = Math.max(height - 2 * SPARKLINE_INSET, 0);
	const xOf = (index: number): number =>
		values.length > 1 ? SPARKLINE_INSET + (index * across) / (values.length - 1) : width / 2;
	const yOf = (value: number): number =>
		high === low ? SPARKLINE_INSET + down / 2 : SPARKLINE_INSET + down - ((value - low) / (high - low)) * down;
	return values.map((value, index) => (value === null ? null : { index, value, x: xOf(index), y: yOf(value) }));
}

export function linePath(spots: SparkSpots): string {
	return runsOf(spots)
		.map((run) =>
			run.map((spot, at) => `${at === 0 ? "M" : "L"}${roundToHundredth(spot.x)} ${roundToHundredth(spot.y)}`).join(""),
		)
		.join("");
}

export function areaPath(spots: SparkSpots, base: number): string {
	return runsOf(spots)
		.map((run) => areaOfRun(run, base))
		.join("");
}

export function sparkBars(values: SparkValues, width: number, height: number): SparkBar[] {
	const known = values.filter(isKnown);
	const floor = Math.min(0, ...known);
	const scale = {
		floor,
		span: Math.max(0, ...known) - floor || 1,
		slot: values.length > 0 ? width / values.length : 0,
		tall: Math.max(height - SPARKLINE_INSET, 0),
		height,
	};
	return values.flatMap((value, index) => (value === null ? [] : [barAt(value, index, scale)]));
}

export function spotAt(spots: SparkSpots, at: unknown): SparkSpot | null {
	const known = spots.filter(isKnown);
	if (known.length === 0) return null;
	if (typeof at === "number") return spots[at] ?? null;
	const place = wornWord(at, SPARKLINE_PLACE_WORD);
	if (place === "first") return known[0] ?? null;
	if (place === "min") return known.reduce((low, spot) => (spot.value < low.value ? spot : low));
	if (place === "max") return known.reduce((high, spot) => (spot.value > high.value ? spot : high));
	return known.at(-1) ?? null;
}

export function highlightedIndex(values: SparkValues, highlight: unknown): number {
	if (typeof highlight === "number") return highlight;
	if (highlight !== "last") return -1;
	return values.reduce<number>((last, value, index) => (value === null ? last : index), -1);
}

function isKnown<T>(value: T | null): value is T {
	return value !== null;
}

function fieldOf(entry: unknown, key: string): unknown {
	return isRecord(entry) ? entry[key] : undefined;
}

function numberIn(held: unknown): number | null {
	if (typeof held === "number") return Number.isFinite(held) ? held : null;
	if (typeof held !== "string" || held.trim() === "") return null;
	const read = Number(held);
	return Number.isFinite(read) ? read : null;
}

function areaOfRun(run: readonly SparkSpot[], base: number): string {
	const first = run[0];
	const last = run.at(-1);
	if (!first || !last) return "";
	const along = run.map((spot) => `L${roundToHundredth(spot.x)} ${roundToHundredth(spot.y)}`).join("");
	return `M${roundToHundredth(first.x)} ${roundToHundredth(base)}${along}L${roundToHundredth(last.x)} ${roundToHundredth(base)}Z`;
}

type BarScale = { floor: number; span: number; slot: number; tall: number; height: number };

function barAt(value: number, index: number, { floor, span, slot, tall, height }: BarScale): SparkBar {
	const drawn = Math.max(((value - floor) / span) * tall, SPARKLINE_BAR_FLOOR);
	return {
		index,
		x: index * slot + (slot * (1 - SPARKLINE_BAR_SHARE)) / 2,
		y: height - drawn,
		width: slot * SPARKLINE_BAR_SHARE,
		height: drawn,
	};
}

function runsOf(spots: SparkSpots): SparkSpot[][] {
	const runs: SparkSpot[][] = [[]];
	for (const spot of spots) {
		if (spot === null) runs.push([]);
		else runs.at(-1)?.push(spot);
	}
	return runs.filter((run) => run.length > 0);
}

function roundToHundredth(value: number): number {
	return Math.round(value * 100) / 100;
}
