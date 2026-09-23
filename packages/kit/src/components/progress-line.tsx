import type { LooseProps } from "../types";
import { createElement as h, useRef } from "react";
import { BarDrawing } from "./bar-drawing";
import { VALUE_GAP_PX } from "../constants/progress";
import { useSlider } from "../hooks/use-slider";
import { useWidthOf } from "../hooks/use-width-of";
import { cx } from "../utils/cx";
import { rangeAria, shownValue } from "../utils/progress";
import { barGeometry } from "../utils/progress-geometry";
import { inkedClass } from "../utils/tones";

export function ProgressLine({
	value = 0,
	onChange,
	label,
	tone = "accent",
	isWavy = true,
	isControlled = false,
	hasStopMark = false,
	displayValue = null,
	className: cls,
}: LooseProps) {
	const slider = useSlider(value, onChange);
	const width = useWidthOf(slider.trackRef);
	const said = shownValue(displayValue, slider.shown);
	const valueRef = useRef(null);
	const roomForValue = useWidthOf(valueRef);
	return (
		<div
			{...barRootProps(slider, isControlled)}
			className={cx(barRootClass(slider, isControlled, tone), said !== null && "has-value", cls)}
			aria-label={label}
			style={{ "--wg-bar-value-room": said === null ? "0px" : `${roomForValue + VALUE_GAP_PX}px` }}
		>
			<span className="wg-kit-bar-line" ref={slider.trackRef}>
				{width > 0 && (
					<BarDrawing
						width={width}
						drawn={barGeometry(width, slider.shown, { isWavy, isCursorVisible: isControlled })}
						hasStopMark={hasStopMark}
					/>
				)}
			</span>
			<span className="wg-kit-bar-value">
				<span className="wg-kit-bar-said" ref={valueRef}>
					{said}
				</span>
			</span>
		</div>
	);
}

function barRootClass({ isGrabbed }, isControlled, tone) {
	return cx("wg-kit-bar", inkedClass(tone), isControlled && "is-settable", isGrabbed && "is-grabbed");
}

function barRootProps({ shown, sliderProps, trackProps }, isSettable) {
	if (isSettable) return { ...sliderProps, ...trackProps };
	return { role: "progressbar", ...rangeAria(shown) };
}
