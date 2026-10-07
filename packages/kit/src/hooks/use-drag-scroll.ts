import { useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type { CarouselApi, CarouselOrientation } from "../utils/carousel";

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

const FLICK_PX = 24;

export function useDragScroll(api: CarouselApi, orientation: CarouselOrientation): DragScroll {
	const drag = useRef<DragStart | null>(null);
	const wasDragged = useRef(false);
	const [isDragging, setDragging] = useState(false);
	const isVertical = orientation === "vertical";
	const pointerAt = (event: PointerEvent<HTMLElement>): number => (isVertical ? event.clientY : event.clientX);
	return {
		isDragging,
		onPointerDown: (event) => {
			if (event.pointerType !== "mouse" || event.button !== 0) return;
			const viewport = event.currentTarget;
			const scroll = isVertical ? viewport.scrollTop : viewport.scrollLeft;
			drag.current = {
				pointer: pointerAt(event),
				scroll,
				selected: api.selectedScrollSnap(),
				moved: 0,
				isMoving: false,
			};
			wasDragged.current = false;
		},
		onPointerMove: (event) => {
			const start = drag.current;
			if (!start) return;
			const moved = pointerAt(event) - start.pointer;
			if (!start.isMoving && Math.abs(moved) < FLICK_PX / 4) return;
			if (!start.isMoving) {
				event.currentTarget.setPointerCapture?.(event.pointerId);
				setDragging(true);
			}
			drag.current = { ...start, moved, isMoving: true };
			if (isVertical) event.currentTarget.scrollTop = start.scroll - moved;
			else event.currentTarget.scrollLeft = start.scroll - moved;
		},
		onPointerUp: () => {
			const start = drag.current;
			drag.current = null;
			if (!start?.isMoving) return;
			wasDragged.current = true;
			setDragging(false);
			api.scrollTo(landingOf(start, api.selectedScrollSnap(), api.scrollSnapList().length));
		},
		onClickCapture: (event) => {
			if (!wasDragged.current) return;
			wasDragged.current = false;
			event.preventDefault();
			event.stopPropagation();
		},
	};
}

function landingOf(start: DragStart, nearest: number, count: number): number {
	if (nearest !== start.selected || Math.abs(start.moved) < FLICK_PX) return nearest;
	const step = start.moved < 0 ? 1 : -1;
	return Math.min(Math.max(start.selected + step, 0), count - 1);
}
