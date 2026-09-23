import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { useSlider } from "../hooks/use-slider";
import { cx } from "../utils/cx";

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
