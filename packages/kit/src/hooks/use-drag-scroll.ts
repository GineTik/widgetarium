import { useRef, useState } from "react";
import type { MouseEvent, PointerEvent, RefObject } from "react";
import type { CarouselApi, CarouselOrientation } from "../utils/carousel";
import { clamp } from "../utils/clamp";
import { pointerAxisOf } from "../utils/pointer-axis";
import { scrollOffsetOf, scrollToOffset } from "../utils/scroll-axis";

export interface DragScroll {
	readonly isDragging: boolean;
	readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void;
	readonly onClickCapture: (event: MouseEvent<HTMLElement>) => void;
}

interface DragStart {
	readonly pointer: number;
	readonly scroll: number;
	readonly selected: number;
	readonly moved: number;
	readonly isMoving: boolean;
}

interface DragHeld {
	readonly api: CarouselApi;
	readonly isVertical: boolean;
	readonly drag: RefObject<DragStart | null>;
	readonly wasDragged: RefObject<boolean>;
	readonly setDragging: (isDragging: boolean) => void;
}

const FLICK_PX = 24;

export function useDragScroll(api: CarouselApi, orientation: CarouselOrientation): DragScroll {
	const drag = useRef<DragStart | null>(null);
	const wasDragged = useRef(false);
	const [isDragging, setDragging] = useState(false);
	const held: DragHeld = { api, isVertical: orientation === "vertical", drag, wasDragged, setDragging };
	return {
		isDragging,
		onPointerDown: (event) => startDrag(event, held),
		onPointerMove: (event) => moveDrag(event, held),
		onPointerUp: () => endDrag(held),
		onClickCapture: (event) => swallowClickAfterDrag(event, held),
	};
}

function startDrag(event: PointerEvent<HTMLElement>, held: DragHeld): void {
	if (event.pointerType !== "mouse" || event.button !== 0) return;
	held.drag.current = {
		pointer: pointerAxisOf(event, held.isVertical),
		scroll: scrollOffsetOf(event.currentTarget, held.isVertical),
		selected: held.api.selectedScrollSnap(),
		moved: 0,
		isMoving: false,
	};
	held.wasDragged.current = false;
}

function moveDrag(event: PointerEvent<HTMLElement>, held: DragHeld): void {
	const start = held.drag.current;
	if (!start) return;
	const moved = pointerAxisOf(event, held.isVertical) - start.pointer;
	if (!start.isMoving && Math.abs(moved) < FLICK_PX / 4) return;
	if (!start.isMoving) {
		event.currentTarget.setPointerCapture?.(event.pointerId);
		held.setDragging(true);
	}
	held.drag.current = { ...start, moved, isMoving: true };
	scrollToOffset(event.currentTarget, held.isVertical, start.scroll - moved);
}

function endDrag(held: DragHeld): void {
	const start = held.drag.current;
	held.drag.current = null;
	if (!start?.isMoving) return;
	held.wasDragged.current = true;
	held.setDragging(false);
	held.api.scrollTo(landingOf(start, held.api.selectedScrollSnap(), held.api.scrollSnapList().length));
}

function swallowClickAfterDrag(event: MouseEvent<HTMLElement>, { wasDragged }: DragHeld): void {
	if (!wasDragged.current) return;
	wasDragged.current = false;
	event.preventDefault();
	event.stopPropagation();
}

function landingOf(start: DragStart, nearest: number, count: number): number {
	if (nearest !== start.selected || Math.abs(start.moved) < FLICK_PX) return nearest;
	const step = start.moved < 0 ? 1 : -1;
	return clamp(start.selected + step, 0, count - 1);
}
