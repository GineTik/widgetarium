import { createElement as h, useRef } from "react";
import {
	BAR_STROKE,
	CIRCLE_SIZE,
	DONE_ICON_PX,
	PROGRESS_SHAPES,
	STATUS_TONES,
	VALUE_GAP_PX,
} from "../constants/progress";
import { useSlider } from "../hooks/use-slider";
import { useWidthOf } from "../hooks/use-width-of";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cx } from "../utils/cx";
import { clampPercent, progressState, rangeAria, shownValue } from "../utils/progress";
import { barGeometry, circleGeometry } from "../utils/progress-geometry";
import { warnOnce } from "../utils/surface";
import { inkedClass } from "../utils/tones";

export function Progress({ value = 0, onChange, label, className: cls }: LooseProps) {
	const { shown, isGrabbed, trackRef, sliderProps, trackProps } = useSlider(value, onChange);
	return (
		<div className={cx("wg-kit-progress", isGrabbed && "is-grabbed", cls)} aria-label={label} {...sliderProps}>
			<span className="wg-kit-progress-track" ref={trackRef} {...trackProps}>
				<i className="wg-kit-progress-fill" style={{ width: `${shown}%` }} />
				<span className="wg-kit-progress-knob" style={{ left: `${shown}%` }} />
			</span>
			<span className="wg-kit-progress-num">{`${shown}%`}</span>
		</div>
	);
}

function wornWord(asked, offered, what) {
	if (offered.includes(asked)) return asked;
	warnOnce(`${asked} is no ${what}, so ${offered[0]} was drawn instead: ${offered.join(", ")}`);
	return offered[0];
}

export function ProgressBar({ shape = "line", ...props }: LooseProps) {
	if (wornWord(shape, PROGRESS_SHAPES, "progress shape") === "circle") return <ProgressCircle {...props} />;
	return <ProgressLine {...props} />;
}

function ProgressLine({
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

function ProgressCircle({
	value = 0,
	label,
	tone = "accent",
	isWavy = true,
	size = CIRCLE_SIZE,
	displayValue = null,
	className: cls,
}: LooseProps) {
	const shown = clampPercent(value);
	const drawn = circleGeometry(size, shown, { isWavy });
	const said = shownValue(displayValue, shown);
	return (
		<div
			className={cx("wg-kit-ring", inkedClass(tone), cls)}
			style={{ width: `${size}px`, height: `${size}px` }}
			role="progressbar"
			aria-label={label}
			{...rangeAria(shown)}
		>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
				{drawn.track && <path className="wg-kit-bar-track" d={drawn.track} />}
				{drawn.active && <path className="wg-kit-bar-active" d={drawn.active} />}
			</svg>
			<span className="wg-kit-ring-value">{said}</span>
		</div>
	);
}

function BarDrawing({ width, drawn, hasStopMark }: LooseProps) {
	const { track, active, cursor, height, middle, stop } = drawn;
	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
			{track && <path className="wg-kit-bar-track" d={track} />}
			{track && hasStopMark && <circle className="wg-kit-bar-stop" cx={stop} cy={middle} r={BAR_STROKE / 2} />}
			{active && <path className="wg-kit-bar-active" d={active} />}
			{cursor && (
				<rect
					className="wg-kit-bar-cursor"
					x={cursor.x}
					y={0}
					width={cursor.width}
					height={height}
					rx={cursor.width / 2}
				/>
			)}
		</svg>
	);
}

function tickWhenDone({ state }) {
	if (state !== "done") return null;
	return <Icon name="tick" size={DONE_ICON_PX} />;
}

export function StatusProgress({ value = 0, tones, displayValue, className: cls, ...rest }: LooseProps) {
	const shown = clampPercent(value);
	const state = progressState(shown);
	return (
		<ProgressBar
			{...rest}
			value={shown}
			tone={{ ...STATUS_TONES, ...tones }[state]}
			displayValue={displayValue ?? tickWhenDone}
			className={cx("wg-kit-status", `is-${state}`, cls)}
		/>
	);
}
