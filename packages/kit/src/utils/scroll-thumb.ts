export type ScrollAxis = "vertical" | "horizontal";

export interface ScrollMetrics {
	readonly scroll: number;
	readonly client: number;
	readonly total: number;
	readonly track: number;
}

export interface ThumbGeometry {
	readonly size: number;
	readonly offset: number;
	readonly isNeeded: boolean;
}

export const NO_THUMB: ThumbGeometry = { size: 0, offset: 0, isNeeded: false };

const SHORTEST_THUMB_PX = 24;

export function metricsOf(viewport: HTMLElement, track: number, axis: ScrollAxis): ScrollMetrics {
	if (axis === "vertical")
		return { scroll: viewport.scrollTop, client: viewport.clientHeight, total: viewport.scrollHeight, track };
	return { scroll: Math.abs(viewport.scrollLeft), client: viewport.clientWidth, total: viewport.scrollWidth, track };
}

export function thumbOf({ scroll, client, total, track }: ScrollMetrics): ThumbGeometry {
	const reach = total - client;
	if (reach <= 1 || track <= 0) return NO_THUMB;
	const size = Math.min(track, Math.max(SHORTEST_THUMB_PX, (track * client) / total));
	const offset = ((track - size) * Math.min(Math.max(scroll, 0), reach)) / reach;
	return { size, offset, isNeeded: true };
}

export function scrollPerThumbPx({ client, total, track }: ScrollMetrics): number {
	const free = track - thumbOf({ scroll: 0, client, total, track }).size;
	return free > 0 ? (total - client) / free : 0;
}
