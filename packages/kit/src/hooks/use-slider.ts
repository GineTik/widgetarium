import { useRef } from "react";
import { useSliderPointer } from "./use-slider-pointer";
import { clampPercent } from "../utils/progress";
import { sliderPropsOf } from "../utils/slider";

export function useSlider(value, onChange) {
	const trackRef = useRef(null);
	const shown = clampPercent(value);
	const report = (next) => {
		if (next !== null && next !== shown) onChange?.(next);
	};
	const { isGrabbed, trackProps } = useSliderPointer(trackRef, report);
	return { shown, isGrabbed, trackRef, trackProps, sliderProps: sliderPropsOf(shown, report) };
}
