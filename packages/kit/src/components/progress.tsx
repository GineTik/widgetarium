import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useSlider } from "../hooks/use-slider";
import { cn } from "../utils/cn";

export { ProgressBar } from "./progress-bar";
export { StatusProgress } from "./status-progress";
export type { ProgressBarProps } from "./progress-bar";
export type { StatusProgressProps } from "./status-progress";

export interface ProgressProps {
	readonly value?: unknown;
	readonly onChange?: ((percent: number) => void) | undefined;
	readonly label?: string | undefined;
	readonly className?: string | undefined;
}

export function Progress({ value = 0, onChange, label, className: cls }: ProgressProps): ReactElement {
	const { shown, isGrabbed, trackRef, sliderProps, trackProps } = useSlider(value, onChange);
	return (
		<div className={cn("wg-kit-progress", isGrabbed && "is-grabbed", cls)} aria-label={label} {...sliderProps}>
			<span className="wg-kit-progress-track" ref={trackRef} {...trackProps}>
				<i className="wg-kit-progress-fill" style={{ width: `${shown}%` }} />
				<span className="wg-kit-progress-knob" style={{ left: `${shown}%` }} />
			</span>
			<span className="wg-kit-progress-num">{`${shown}%`}</span>
		</div>
	);
}
