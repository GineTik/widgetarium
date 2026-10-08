import { useRef } from "react";
import type { RefObject } from "react";
import { withThumbAt } from "../utils/slider-range";
import type { RangeSliderAsk, SliderScale } from "../utils/slider-range";
import { useControllableState } from "./use-controllable-state";

export interface HeldThumbs {
	readonly values: readonly number[];
	readonly latest: RefObject<readonly number[]>;
	readonly moveThumb: (at: number, value: number | null) => readonly number[];
}

interface MoveAsk {
	readonly latest: RefObject<readonly number[]>;
	readonly setValues: (next: readonly number[]) => void;
	readonly scale: SliderScale;
}

export function useHeldThumbs(ask: RangeSliderAsk): HeldThumbs {
	const [values, setValues] = useControllableState<readonly number[]>({
		prop: ask.value,
		defaultProp: ask.defaultValue ?? [ask.scale.min],
		onChange: (next) => ask.onValueChange?.([...next]),
	});
	const latest = useRef(values);
	latest.current = values;
	const moveThumb = (at: number, value: number | null): readonly number[] =>
		movedThumbs({ latest, setValues, scale: ask.scale }, at, value);
	return { values, latest, moveThumb };
}

function movedThumbs({ latest, setValues, scale }: MoveAsk, at: number, value: number | null): readonly number[] {
	if (value === null) return latest.current;
	const next = withThumbAt(latest.current, at, value, scale);
	if (next.every((held, index) => held === latest.current[index])) return latest.current;
	latest.current = next;
	setValues(next);
	return next;
}
