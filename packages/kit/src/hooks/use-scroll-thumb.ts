import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { NO_THUMB, metricsOf, scrollPerThumbPx, thumbOf } from "../utils/scroll-thumb";
import type { ScrollAxis, ThumbGeometry } from "../utils/scroll-thumb";

export interface ScrollThumb {
	readonly barRef: RefObject<HTMLDivElement | null>;
	readonly thumb: ThumbGeometry;
	readonly isDragging: boolean;
	readonly onThumbDown: (event: PointerEvent<HTMLElement>) => void;
	readonly onThumbMove: (event: PointerEvent<HTMLElement>) => void;
	readonly onThumbUp: (event: PointerEvent<HTMLElement>) => void;
}

interface DragStart {
	readonly pointer: number;
	readonly scroll: number;
	readonly ratio: number;
}

export function useScrollThumb(viewportRef: RefObject<HTMLElement | null>, axis: ScrollAxis): ScrollThumb {
	const barRef = useRef<HTMLDivElement | null>(null);
	const [thumb, setThumb] = useState<ThumbGeometry>(NO_THUMB);
	const drag = useRef<DragStart | null>(null);
	const [isDragging, setDragging] = useState(false);
	useLayoutEffect(() => watchThumb({ viewport: viewportRef.current, bar: barRef.current, axis, setThumb }), [axis]);
	const pointerAt = (event: PointerEvent<HTMLElement>): number => (axis === "vertical" ? event.clientY : event.clientX);
	return {
		barRef,
		thumb,
		isDragging,
		onThumbDown: (event) => {
			const viewport = viewportRef.current;
			const bar = barRef.current;
			if (!viewport || !bar) return;
			event.preventDefault();
			event.currentTarget.setPointerCapture?.(event.pointerId);
			const metrics = metricsOf(viewport, trackOf(bar, axis), axis);
			drag.current = { pointer: pointerAt(event), scroll: metrics.scroll, ratio: scrollPerThumbPx(metrics) };
			setDragging(true);
		},
		onThumbMove: (event) => {
			const start = drag.current;
			const viewport = viewportRef.current;
			if (!start || !viewport) return;
			scrollTo(viewport, axis, start.scroll + (pointerAt(event) - start.pointer) * start.ratio);
		},
		onThumbUp: () => {
			drag.current = null;
			setDragging(false);
		},
	};
}

interface ThumbWatch {
	readonly viewport: HTMLElement | null;
	readonly bar: HTMLElement | null;
	readonly axis: ScrollAxis;
	readonly setThumb: (thumb: ThumbGeometry) => void;
}

function watchThumb({ viewport, bar, axis, setThumb }: ThumbWatch): (() => void) | undefined {
	if (!viewport || !bar) return undefined;
	const measure = (): void => setThumb(thumbOf(metricsOf(viewport, trackOf(bar, axis), axis)));
	measure();
	viewport.addEventListener("scroll", measure, { passive: true });
	const watcher = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
	watcher?.observe(viewport);
	for (const child of Array.from(viewport.children)) watcher?.observe(child);
	return () => {
		viewport.removeEventListener("scroll", measure);
		watcher?.disconnect();
	};
}

function trackOf(bar: HTMLElement, axis: ScrollAxis): number {
	return axis === "vertical" ? bar.clientHeight : bar.clientWidth;
}

function scrollTo(viewport: HTMLElement, axis: ScrollAxis, at: number): void {
	if (axis === "vertical") viewport.scrollTop = at;
	else viewport.scrollLeft = at;
}
