import { clamp } from "./clamp";

export type SnapPoint = number | `${number}px`;

export interface SnapLayer {
	readonly layerPx: number;
	readonly insetPx: number;
}

export interface SnapRelease {
	readonly heights: readonly number[];
	readonly shownPx: number;
	readonly upwardPxPerMs: number;
	readonly isDismissible: boolean;
}

export const CLOSED_SNAP = -1;

const CLOSE_FRACTION_DRAGGED = 0.25;

const PROJECTION_MS = 200;

export function snapHeightsOf(points: readonly SnapPoint[], { layerPx, insetPx }: SnapLayer): number[] {
	return points.map((point) => Math.max(0, Math.min(snapPxOf(point, layerPx), layerPx - insetPx)));
}

export function settledSnapIndex({ heights, shownPx, upwardPxPerMs, isDismissible }: SnapRelease): number {
	const projectedPx = shownPx + upwardPxPerMs * PROJECTION_MS;
	const lowestPx = heights[0] ?? 0;
	if (isDismissible && projectedPx < lowestPx * (1 - CLOSE_FRACTION_DRAGGED)) return CLOSED_SNAP;
	return nearestIndexOf(heights, projectedPx);
}

export function cycledSnapIndex(index: number, count: number, isDismissible: boolean): number {
	if (index < count - 1) return index + 1;
	return isDismissible ? CLOSED_SNAP : index;
}

export function snapIndexByKey(key: string, index: number, count: number, isDismissible: boolean): number | null {
	if (key === "Enter" || key === " ") return cycledSnapIndex(index, count, isDismissible);
	if (count <= 1) return null;
	if (key === "ArrowUp") return Math.min(index + 1, count - 1);
	if (key === "ArrowDown") return Math.max(index - 1, 0);
	if (key === "Home") return 0;
	if (key === "End") return count - 1;
	return null;
}

export function fadeAt(heights: readonly number[], fadeFromIndex: number, shownPx: number): number {
	const fullAtPx = heights[fadeFromIndex];
	if (fullAtPx === undefined) return 1;
	const clearAtPx = heights[fadeFromIndex - 1] ?? 0;
	if (fullAtPx <= clearAtPx) return shownPx >= fullAtPx ? 1 : 0;
	return clamp((shownPx - clearAtPx) / (fullAtPx - clearAtPx), 0, 1);
}

function snapPxOf(point: SnapPoint, layerPx: number): number {
	return typeof point === "number" ? point * layerPx : parseFloat(point);
}

function nearestIndexOf(heights: readonly number[], px: number): number {
	return heights.reduce(
		(nearest, height, index) => (Math.abs(height - px) < Math.abs((heights[nearest] ?? 0) - px) ? index : nearest),
		0,
	);
}
