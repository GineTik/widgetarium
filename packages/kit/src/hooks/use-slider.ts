import { useRef } from "react";
import type { RefObject } from "react";
import { useSliderPointer } from "./use-slider-pointer";
import type { TrackProps } from "./use-slider-pointer";
import { clampPercent } from "../utils/progress";
import { sliderPropsOf } from "../utils/slider";
import type { SliderProps } from "../utils/slider";

export interface Slider {
	readonly shown: number;
	readonly isGrabbed: boolean;
	readonly trackRef: RefObject<HTMLDivElement | null>;
	readonly trackProps: TrackProps;
	readonly sliderProps: SliderProps;
}

export function useSlider(value: unknown, onChange: ((next: number) => void) | undefined): Slider {
	const trackRef = useRef<HTMLDivElement>(null);
	const shown = clampPercent(value);
	const report = (next: number | null): void => {
		if (next !== null && next !== shown) onChange?.(next);
	};
	const { isGrabbed, trackProps } = useSliderPointer(trackRef, report);
	return { shown, isGrabbed, trackRef, trackProps, sliderProps: sliderPropsOf(shown, report) };
}
