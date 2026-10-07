export type CarouselOrientation = "horizontal" | "vertical";

export type CarouselEvent = "select" | "scroll" | "reInit";

export interface CarouselOptions {
	readonly loop?: boolean | undefined;
}

export interface CarouselApi {
	readonly scrollPrev: () => void;
	readonly scrollNext: () => void;
	readonly scrollTo: (index: number) => void;
	readonly canScrollPrev: () => boolean;
	readonly canScrollNext: () => boolean;
	readonly selectedScrollSnap: () => number;
	readonly scrollSnapList: () => number[];
	readonly rootNode: () => HTMLElement | null;
	readonly on: (event: CarouselEvent, listener: CarouselListener) => CarouselApi;
	readonly off: (event: CarouselEvent, listener: CarouselListener) => CarouselApi;
}

export type CarouselListener = (api: CarouselApi, event: CarouselEvent) => void;

const SAME_SNAP_PX = 1;

export const ITEM_SELECTOR = "[data-slot='carousel-item']";

export function snapsIn(viewport: HTMLElement, orientation: CarouselOrientation): number[] {
	const isVertical = orientation === "vertical";
	const box = viewport.getBoundingClientRect();
	const reach = isVertical
		? viewport.scrollHeight - viewport.clientHeight
		: viewport.scrollWidth - viewport.clientWidth;
	const scrolled = isVertical ? viewport.scrollTop : viewport.scrollLeft;
	const starts = [...viewport.querySelectorAll(ITEM_SELECTOR)].map((item) => {
		const at = item.getBoundingClientRect();
		const margin = Number.parseFloat(getComputedStyle(item)[isVertical ? "scrollMarginTop" : "scrollMarginLeft"]) || 0;
		return (isVertical ? at.top - box.top : at.left - box.left) + scrolled - margin;
	});
	return distinctSnaps(starts.map((start) => Math.min(Math.max(start, 0), Math.max(reach, 0))));
}

export function distinctSnaps(starts: readonly number[]): number[] {
	return starts.reduce<number[]>((kept, start) => {
		const last = kept.at(-1);
		return last !== undefined && Math.abs(last - start) < SAME_SNAP_PX ? kept : [...kept, start];
	}, []);
}

export function nearestSnap(snaps: readonly number[], at: number): number {
	let nearest = 0;
	snaps.forEach((snap, index) => {
		if (Math.abs(snap - at) < Math.abs((snaps[nearest] ?? 0) - at)) nearest = index;
	});
	return nearest;
}

export function steppedSnap(at: number, step: number, count: number, isLooping: boolean): number {
	const next = at + step;
	if (isLooping) return (next + count) % count;
	return Math.min(Math.max(next, 0), count - 1);
}
