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

export function stackOf(
	records: readonly ToastRecord[],
	heights: ReadonlyMap<ToastId, number>,
	visibleCount: number,
): ToastStack {
	let index = 0;
	let offsetPx = 0;
	let frontHeightPx = 0;
	const items = records.map((record) => {
		const spot = { index, offsetPx, isVisible: index < visibleCount };
		if (record.isLeaving) return { record, spot };
		const heightPx = heights.get(record.id) ?? 0;
		if (index === 0) frontHeightPx = heightPx;
		index += 1;
		offsetPx += heightPx + TOAST_GAP_PX;
		return { record, spot };
	});
	return { items, frontHeightPx };
}
