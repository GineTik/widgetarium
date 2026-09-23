import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { CIRCLE_SIZE } from "../constants/progress";
import { cx } from "../utils/cx";
import { clampPercent, rangeAria, shownValue } from "../utils/progress";
import { circleGeometry } from "../utils/progress-geometry";
import { inkedClass } from "../utils/tones";

export function ProgressCircle({
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
