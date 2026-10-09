import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import { keyedValue, nearestThumb, thumbWithin, uprightKeyOf, valueUnder } from "../utils/slider-range";
import type { RangeSliderAsk } from "../utils/slider-range";
import { useDraggedThumb } from "./use-dragged-thumb";
import type { DraggedThumbs } from "./use-dragged-thumb";
import { useHeldThumbs } from "./use-held-thumbs";
import type { HeldThumbs } from "./use-held-thumbs";

export interface RangeSliderPointer {
	readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerUp: () => void;
	readonly onPointerCancel: () => void;
}

export interface RangeSlider {
	readonly values: readonly number[];
	readonly drawnValues: readonly number[];
	readonly grabbed: number | null;
	readonly trackRef: RefObject<HTMLSpanElement | null>;
	readonly pointer: RangeSliderPointer;
	readonly keysOf: (at: number) => (event: KeyboardEvent<HTMLElement>) => void;
}

interface DragAsk {
	readonly ask: RangeSliderAsk;
	readonly held: HeldThumbs;
	readonly dragged: DraggedThumbs;
	readonly trackRef: RefObject<HTMLSpanElement | null>;
	readonly grabbed: number | null;
	readonly setGrabbed: (at: number | null) => void;
}

type ThumbKeyAsk = Pick<DragAsk, "ask" | "held">;

export function useRangeSlider(ask: RangeSliderAsk): RangeSlider {
	const held = useHeldThumbs(ask);
	const dragged = useDraggedThumb();
	const trackRef = useRef<HTMLSpanElement>(null);
	const [grabbed, setGrabbed] = useState<number | null>(null);
	return {
		values: held.values,
		drawnValues: drawnValuesOf(held.values, dragged),
		grabbed,
		trackRef,
		pointer: pointerOf({ ask, held, dragged, trackRef, grabbed, setGrabbed }),
		keysOf: (at) => (event) => answerThumbKey({ ask, held }, at, event),
	};
}

function drawnValuesOf(values: readonly number[], { dragged }: DraggedThumbs): readonly number[] {
	if (!dragged) return values;
	return values.map((held, at) => (at === dragged.at ? dragged.value : held));
}

function pointerOf(drag: DragAsk): RangeSliderPointer {
	const { grabbed } = drag;
	return {
		onPointerDown: (event) => grabNearest(drag, event),
		onPointerMove: (event) => {
			if (grabbed === null) return;
			dragThumb(drag, grabbed, valueAt(drag, event));
		},
		onPointerUp: () => release(drag),
		onPointerCancel: () => letGo(drag),
	};
}

function dragThumb({ ask, held, dragged }: DragAsk, at: number, value: number | null): void {
	if (value === null) return;
	held.moveThumb(at, value);
	dragged.follow({ at, value: thumbWithin(held.latest.current, at, value, ask.scale) });
}

function release(drag: DragAsk): void {
	if (drag.grabbed === null) return;
	commitValues(drag.ask, drag.held.latest.current);
	letGo(drag);
}

function letGo({ ask, held, dragged, trackRef, grabbed, setGrabbed }: DragAsk): void {
	if (grabbed === null) return;
	dragged.settle(held.latest.current[grabbed] ?? ask.scale.min, trackRef.current);
	setGrabbed(null);
}

function grabNearest(drag: DragAsk, event: PointerEvent<HTMLElement>): void {
	const value = valueAt(drag, event);
	if (drag.ask.disabled || value === null) return;
	const at = nearestThumb(drag.held.latest.current, value);
	event.currentTarget.setPointerCapture?.(event.pointerId);
	event.preventDefault();
	drag.setGrabbed(at);
	dragThumb(drag, at, value);
	const thumb = event.currentTarget.querySelectorAll<HTMLElement>("[role='slider']")[at];
	(thumb ?? event.currentTarget.closest<HTMLElement>("[role='slider']"))?.focus();
}

function valueAt({ ask, trackRef }: DragAsk, event: PointerEvent<HTMLElement>): number | null {
	return valueUnder(
		event,
		{ track: trackRef.current, orientation: ask.orientation, inverted: ask.inverted },
		ask.scale,
	);
}

function answerThumbKey({ ask, held }: ThumbKeyAsk, at: number, event: KeyboardEvent<HTMLElement>): void {
	const key = uprightKeyOf(event.key, ask.orientation, ask.inverted);
	const value = keyedValue(
		{ key, isShift: event.shiftKey, value: held.latest.current[at] ?? ask.scale.min },
		ask.scale,
	);
	if (ask.disabled || value === null) return;
	event.preventDefault();
	const before = held.latest.current;
	const next = held.moveThumb(at, value);
	if (next !== before) commitValues(ask, next);
}

function commitValues(ask: RangeSliderAsk, next: readonly number[]): void {
	ask.onValueCommit?.([...next]);
}
