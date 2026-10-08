import { TOAST_GAP_PX } from "../constants/overlays";
import type { ToastId, ToastRecord } from "./toast-queue";

export interface ToastSpot {
	readonly index: number;
	readonly offsetPx: number;
	readonly isVisible: boolean;
}

export interface StackedToast {
	readonly record: ToastRecord;
	readonly spot: ToastSpot;
}

export interface ToastStack {
	readonly items: readonly StackedToast[];
	readonly frontHeightPx: number;
}

type Ahead = Pick<ToastSpot, "index" | "offsetPx">;

export function stackOf(
	records: readonly ToastRecord[],
	heights: ReadonlyMap<ToastId, number>,
	visibleCount: number,
): ToastStack {
	let ahead: Ahead = { index: 0, offsetPx: 0 };
	const items = records.map((record) => {
		const spot = { ...ahead, isVisible: ahead.index < visibleCount };
		if (!record.isLeaving) ahead = stepPast(ahead, heights.get(record.id) ?? 0);
		return { record, spot };
	});
	return { items, frontHeightPx: frontHeightOf(records, heights) };
}

function stepPast(ahead: Ahead, heightPx: number): Ahead {
	return { index: ahead.index + 1, offsetPx: ahead.offsetPx + heightPx + TOAST_GAP_PX };
}

function frontHeightOf(records: readonly ToastRecord[], heights: ReadonlyMap<ToastId, number>): number {
	const front = records.find((record) => !record.isLeaving);
	if (!front) return 0;
	return heights.get(front.id) ?? 0;
}
