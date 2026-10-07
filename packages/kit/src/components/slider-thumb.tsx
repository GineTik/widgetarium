import { createElement as h } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { cn } from "../utils/cn";
import type { SliderOrientation, SliderScale } from "../utils/slider-range";
import type { TokenStyle } from "../utils/token-style";

export interface SliderThumbProps {
	readonly value: number;
	readonly percent: number;
	readonly scale: SliderScale;
	readonly orientation: SliderOrientation;
	readonly disabled: boolean;
	readonly isGrabbed: boolean;
	readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export function SliderThumb({
	value,
	percent,
	scale,
	orientation,
	disabled,
	isGrabbed,
	onKeyDown,
}: SliderThumbProps): ReactElement {
	return (
		<span
			role="slider"
			data-slot="slider-thumb"
			tabIndex={disabled ? -1 : 0}
			aria-valuemin={scale.min}
			aria-valuemax={scale.max}
			aria-valuenow={value}
			aria-orientation={orientation}
			aria-disabled={disabled || undefined}
			data-grabbed={isGrabbed ? "" : undefined}
			className={cn("wg-kit-slider-thumb", isGrabbed && "is-grabbed")}
			style={thumbStyleOf(percent)}
			onKeyDown={onKeyDown}
		/>
	);
}

function thumbStyleOf(percent: number): TokenStyle {
	return { "--wg-slider-at": `${percent}%` };
}
