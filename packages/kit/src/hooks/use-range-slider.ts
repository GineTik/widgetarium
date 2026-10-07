import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import { keyedValue, nearestThumb, uprightKeyOf, valueUnder, withThumbAt } from "../utils/slider-range";
import type { RangeSliderAsk } from "../utils/slider-range";
import { useControllableState } from "./use-controllable-state";

export interface RangeSliderPointer {
	readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerUp: () => void;
	readonly onPointerCancel: () => void;
}

export interface RangeSlider {
	readonly values: readonly number[];
	readonly grabbed: number | null;
	readonly trackRef: RefObject<HTMLSpanElement | null>;
	readonly pointer: RangeSliderPointer;
	readonly keysOf: (at: number) => (event: KeyboardEvent<HTMLElement>) => void;
}

export function useRangeSlider(ask: RangeSliderAsk): RangeSlider {
	const { scale, orientation, inverted, disabled } = ask;
	const [values, setValues] = useControllableState<readonly number[]>({
		prop: ask.value,
		defaultProp: ask.defaultValue ?? [scale.min],
		onChange: (next) => ask.onValueChange?.([...next]),
	});
	const trackRef = useRef<HTMLSpanElement>(null);
	const [grabbed, setGrabbed] = useState<number | null>(null);
	const latest = useRef(values);
	latest.current = values;
	const moveThumb = (at: number, value: number | null): readonly number[] => {
		if (value === null) return latest.current;
		const next = withThumbAt(latest.current, at, value, scale);
		if (next.every((held, index) => held === latest.current[index])) return latest.current;
		latest.current = next;
		setValues(next);
		return next;
	};
	const commit = (next: readonly number[]): void => ask.onValueCommit?.([...next]);
	const under = (event: PointerEvent<HTMLElement>): number | null =>
		valueUnder(event, { track: trackRef.current, orientation, inverted }, scale);
	const pointer: RangeSliderPointer = {
		onPointerDown: (event) => {
			const value = under(event);
			if (disabled || value === null) return;
			const at = nearestThumb(latest.current, value);
			event.currentTarget.setPointerCapture?.(event.pointerId);
			event.preventDefault();
			setGrabbed(at);
			moveThumb(at, value);
			event.currentTarget.querySelectorAll<HTMLElement>("[role='slider']")[at]?.focus();
		},
		onPointerMove: (event) => {
			if (grabbed !== null) moveThumb(grabbed, under(event));
		},
		onPointerUp: () => {
			if (grabbed !== null) commit(latest.current);
			setGrabbed(null);
		},
		onPointerCancel: () => setGrabbed(null),
	};
	const keysOf = (at: number) => (event: KeyboardEvent<HTMLElement>) => {
		const key = uprightKeyOf(event.key, orientation, inverted);
		const value = keyedValue(key, event.shiftKey, latest.current[at] ?? scale.min, scale);
		if (disabled || value === null) return;
		event.preventDefault();
		const before = latest.current;
		const next = moveThumb(at, value);
		if (next !== before) commit(next);
	};
	return { values, grabbed, trackRef, pointer, keysOf };
}
