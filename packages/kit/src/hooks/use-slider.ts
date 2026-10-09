import type { KeyboardEvent, RefObject } from "react";
import { PROGRESS_MAX } from "../constants/progress";
import { clampPercent, rangeAria } from "../utils/progress";
import type { RangeAria } from "../utils/progress";
import type { RangeSliderAsk } from "../utils/slider-range";
import { useRangeSlider } from "./use-range-slider";
import type { RangeSliderPointer } from "./use-range-slider";

export interface SliderProps extends RangeAria {
	readonly role: "slider";
	readonly tabIndex: number;
	readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface Slider {
	readonly shown: number;
	readonly drawn: number;
	readonly isGrabbed: boolean;
	readonly trackRef: RefObject<HTMLSpanElement | null>;
	readonly trackProps: RangeSliderPointer;
	readonly sliderProps: SliderProps;
}

const PERCENT_SCALE = { min: 0, max: PROGRESS_MAX, step: 1, minStepsBetweenThumbs: 0 } as const;

export function useSlider(value: unknown, onChange: ((next: number) => void) | undefined): Slider {
	const shown = clampPercent(value);
	const slider = useRangeSlider(percentAskOf(shown, onChange));
	return {
		shown,
		drawn: slider.drawnValues[0] ?? shown,
		isGrabbed: slider.grabbed !== null,
		trackRef: slider.trackRef,
		trackProps: slider.pointer,
		sliderProps: { role: "slider", tabIndex: 0, ...rangeAria(shown), onKeyDown: slider.keysOf(0) },
	};
}

function percentAskOf(shown: number, onChange: ((next: number) => void) | undefined): RangeSliderAsk {
	return {
		value: [shown],
		onValueChange: ([next]) => {
			if (next !== undefined) onChange?.(next);
		},
		scale: PERCENT_SCALE,
		orientation: "horizontal",
		inverted: false,
		disabled: false,
	};
}
