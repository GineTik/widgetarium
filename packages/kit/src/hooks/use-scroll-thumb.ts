import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { NO_THUMB, metricsOf, scrollPerThumbPx, thumbOf } from "../utils/scroll-thumb";
import type { ScrollAxis, ThumbGeometry } from "../utils/scroll-thumb";
import { watchScrollBox } from "../utils/resize-watch";
import { pointerAxisOf } from "../utils/pointer-axis";
import { scrollToOffset } from "../utils/scroll-axis";

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

type ThumbDrag = Omit<ScrollThumb, "barRef" | "thumb">;

interface ThumbTrack {
	readonly viewportRef: RefObject<HTMLElement | null>;
	readonly barRef: RefObject<HTMLDivElement | null>;
	readonly axis: ScrollAxis;
}

interface ThumbHeld extends ThumbTrack {
	readonly drag: RefObject<DragStart | null>;
	readonly setDragging: (isDragging: boolean) => void;
}

export function useScrollThumb(viewportRef: RefObject<HTMLElement | null>, axis: ScrollAxis): ScrollThumb {
	const barRef = useRef<HTMLDivElement | null>(null);
	const [thumb, setThumb] = useState<ThumbGeometry>(NO_THUMB);
	const thumbDrag = useThumbDrag({ viewportRef, barRef, axis });
	useLayoutEffect(() => watchThumb({ viewport: viewportRef.current, bar: barRef.current, axis, setThumb }), [axis]);
	return { barRef, thumb, ...thumbDrag };
}

function useThumbDrag(track: ThumbTrack): ThumbDrag {
	const drag = useRef<DragStart | null>(null);
	const [isDragging, setDragging] = useState(false);
	const held: ThumbHeld = { ...track, drag, setDragging };
	return {
		isDragging,
		onThumbDown: (event) => grabThumb(event, held),
		onThumbMove: (event) => dragThumb(event, held),
		onThumbUp: () => releaseThumb(held),
	};
}

function grabThumb(event: PointerEvent<HTMLElement>, held: ThumbHeld): void {
	const { viewportRef, barRef, axis, drag, setDragging } = held;
	const viewport = viewportRef.current;
	const bar = barRef.current;
	if (!viewport || !bar) return;
	event.preventDefault();
	event.currentTarget.setPointerCapture?.(event.pointerId);
	const metrics = metricsOf(viewport, trackOf(bar, axis), axis);
	drag.current = {
		pointer: pointerAxisOf(event, axis === "vertical"),
		scroll: metrics.scroll,
		ratio: scrollPerThumbPx(metrics),
	};
	setDragging(true);
}

function dragThumb(event: PointerEvent<HTMLElement>, { viewportRef, axis, drag }: ThumbHeld): void {
	const start = drag.current;
	const viewport = viewportRef.current;
	if (!start || !viewport) return;
	const isVertical = axis === "vertical";
	scrollToOffset(viewport, isVertical, start.scroll + (pointerAxisOf(event, isVertical) - start.pointer) * start.ratio);
}

function releaseThumb({ drag, setDragging }: ThumbHeld): void {
	drag.current = null;
	setDragging(false);
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
	return watchScrollBox(viewport, measure);
}

function trackOf(bar: HTMLElement, axis: ScrollAxis): number {
	return axis === "vertical" ? bar.clientHeight : bar.clientWidth;
}
