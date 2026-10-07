import type { ToastSpot } from "../components/toast-item";
import { TOAST_GAP_PX } from "../constants/overlays";
import type { ToastId, ToastRecord } from "./toast-queue";

export interface StackedToast {
	readonly record: ToastRecord;
	readonly spot: ToastSpot;
}

export function stackOf(
	records: readonly ToastRecord[],
	heights: ReadonlyMap<ToastId, number>,
	visibleCount: number,
): StackedToast[] {
	let index = 0;
	let offsetPx = 0;
	return records.map((record) => {
		const spot = { index, offsetPx, isVisible: index < visibleCount };
		if (record.isLeaving) return { record, spot };
		index += 1;
		offsetPx += (heights.get(record.id) ?? 0) + TOAST_GAP_PX;
		return { record, spot };
	});
}

export function frontHeightOf(records: readonly ToastRecord[], heights: ReadonlyMap<ToastId, number>): number {
	const front = records.find((record) => !record.isLeaving);
	return front ? (heights.get(front.id) ?? 0) : 0;
}
