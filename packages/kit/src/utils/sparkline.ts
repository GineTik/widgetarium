import { SPARKLINE_BAR_FLOOR, SPARKLINE_BAR_SHARE, SPARKLINE_DOT_PLACES, SPARKLINE_INSET } from "../constants/charts";
import { wornWord } from "./surface";

const SPARKLINE_PLACE_WORD = { kind: "sparkline place", allowed: SPARKLINE_DOT_PLACES, fallback: "last" };

export type SparkSpot = { index: number; value: number; x: number; y: number };

export type SparkBar = { index: number; x: number; y: number; width: number; height: number };

export function valuesOf(data: unknown, dataKey?: string): (number | null)[] {
	if (!Array.isArray(data)) return [];
	return data.map((entry) => numberIn(dataKey === undefined ? entry : entry?.[dataKey]));
}

export function sparkSpots(values: (number | null)[], width: number, height: number): (SparkSpot | null)[] {
	const known = values.filter((value) => value !== null);
	const low = Math.min(...known);
	const high = Math.max(...known);
	const across = Math.max(width - 2 * SPARKLINE_INSET, 0);
	const down = Math.max(height - 2 * SPARKLINE_INSET, 0);
	const xOf = (index: number) =>
		values.length > 1 ? SPARKLINE_INSET + (index * across) / (values.length - 1) : width / 2;
	const yOf = (value: number) =>
		high === low ? SPARKLINE_INSET + down / 2 : SPARKLINE_INSET + down - ((value - low) / (high - low)) * down;
	return values.map((value, index) => (value === null ? null : { index, value, x: xOf(index), y: yOf(value) }));
}

export function linePath(spots: (SparkSpot | null)[]): string {
	return runsOf(spots)
		.map((run) =>
			run.map((spot, at) => `${at === 0 ? "M" : "L"}${roundToHundredth(spot.x)} ${roundToHundredth(spot.y)}`).join(""),
		)
		.join("");
}

export function areaPath(spots: (SparkSpot | null)[], base: number): string {
	return runsOf(spots)
		.map((run) => {
			const along = run.map((spot) => `L${roundToHundredth(spot.x)} ${roundToHundredth(spot.y)}`).join("");
			return `M${roundToHundredth(run[0].x)} ${roundToHundredth(base)}${along}L${roundToHundredth(run[run.length - 1].x)} ${roundToHundredth(base)}Z`;
		})
		.join("");
}

export function sparkBars(values: (number | null)[], width: number, height: number): SparkBar[] {
	const known = values.filter((value) => value !== null);
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

export function spotAt(spots: (SparkSpot | null)[], at: unknown): SparkSpot | null {
	const known = spots.filter((spot) => spot !== null);
	if (known.length === 0) return null;
	if (typeof at === "number") return spots[at] ?? null;
	const place = wornWord(at, SPARKLINE_PLACE_WORD);
	if (place === "first") return known[0];
	if (place === "min") return known.reduce((low, spot) => (spot.value < low.value ? spot : low));
	if (place === "max") return known.reduce((high, spot) => (spot.value > high.value ? spot : high));
	return known[known.length - 1];
}

export function highlightedIndex(values: (number | null)[], highlight: unknown): number {
	if (typeof highlight === "number") return highlight;
	if (highlight !== "last") return -1;
	return values.reduce((last, value, index) => (value === null ? last : index), -1);
}

function numberIn(held: unknown): number | null {
	if (typeof held === "number") return Number.isFinite(held) ? held : null;
	if (typeof held !== "string" || held.trim() === "") return null;
	const read = Number(held);
	return Number.isFinite(read) ? read : null;
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

function runsOf(spots: (SparkSpot | null)[]): SparkSpot[][] {
	const runs: SparkSpot[][] = [[]];
	for (const spot of spots) {
		if (spot === null) runs.push([]);
		else runs[runs.length - 1].push(spot);
	}
	return runs.filter((run) => run.length > 0);
}

function roundToHundredth(value: number): number {
	return Math.round(value * 100) / 100;
}
