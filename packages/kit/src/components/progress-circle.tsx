import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CIRCLE_SIZE } from "../constants/progress";
import { cn } from "../utils/cn";
import { clampPercent, rangeAria, shownValue } from "../utils/progress";
import { circleGeometry } from "../utils/progress-geometry";
import { inkedClass } from "../utils/tones";
import type { ProgressBarProps } from "./progress-bar";

export function ProgressCircle({
	value = 0,
	label,
	tone = "accent",
	isWavy = true,
	size = CIRCLE_SIZE,
	displayValue = null,
	className: cls,
}: ProgressBarProps): ReactElement {
	const shown = clampPercent(value);
	const drawn = circleGeometry(size, shown, { isWavy });
	const said = shownValue(displayValue, shown);
	return (
		<div
			className={cn("wg-kit-ring", inkedClass(tone), cls)}
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
