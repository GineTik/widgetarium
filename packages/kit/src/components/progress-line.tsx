import { createElement as h, useRef } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { VALUE_GAP_PX } from "../constants/progress";
import type { ToneName } from "../constants/tones";
import { useSlider } from "../hooks/use-slider";
import type { Slider } from "../hooks/use-slider";
import { useWidthOf } from "../hooks/use-width-of";
import { cn } from "../utils/cn";
import { rangeAria, shownValue } from "../utils/progress";
import { barGeometry } from "../utils/progress-geometry";
import { inkedClass } from "../utils/tones";
import type { TokenStyle } from "../utils/token-style";
import { BarDrawing } from "./bar-drawing";
import type { ProgressBarProps } from "./progress-bar";

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
}: ProgressBarProps): ReactElement {
	const slider = useSlider(value, onChange);
	const width = useWidthOf(slider.trackRef);
	const said = shownValue(displayValue, slider.shown);
	const valueRef = useRef<HTMLSpanElement>(null);
	const roomForValue = useWidthOf(valueRef);
	const valueRoom: TokenStyle = {
		"--wg-bar-value-room": said === null ? "0px" : `${roomForValue + VALUE_GAP_PX}px`,
	};
	return (
		<div
			{...barRootProps(slider, isControlled)}
			className={cn(barRootClass(slider, isControlled, tone), said !== null && "has-value", cls)}
			aria-label={label}
			style={valueRoom}
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

function barRootClass({ isGrabbed }: Slider, isControlled: boolean, tone: ToneName): string {
	return cn("wg-kit-bar", inkedClass(tone), isControlled && "is-settable", isGrabbed && "is-grabbed");
}

function barRootProps({ shown, sliderProps, trackProps }: Slider, isSettable: boolean): HTMLAttributes<HTMLDivElement> {
	if (isSettable) return { ...sliderProps, ...trackProps };
	return { role: "progressbar", ...rangeAria(shown) };
}
