import { createElement as h } from "react";
import type { FocusEvent, KeyboardEvent, ReactElement } from "react";
import { cn } from "../utils/cn";
import type { BarCursor } from "../utils/progress-geometry";
import type { RangeSliderAsk } from "../utils/slider-range";
import type { TokenStyle } from "../utils/token-style";

export interface SliderThumbProps {
	readonly value: number;
	readonly at: BarCursor | undefined;
	readonly ask: Pick<RangeSliderAsk, "scale" | "orientation" | "disabled">;
	readonly isGrabbed: boolean;
	readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
	readonly onFocusVisible: (isVisible: boolean) => void;
}

export function SliderThumb({ value, at, ask, isGrabbed, onKeyDown, onFocusVisible }: SliderThumbProps): ReactElement {
	return (
		<span
			role="slider"
			data-slot="slider-thumb"
			tabIndex={ask.disabled ? -1 : 0}
			aria-valuemin={ask.scale.min}
			aria-valuemax={ask.scale.max}
			aria-valuenow={value}
			aria-orientation={ask.orientation}
			aria-disabled={ask.disabled || undefined}
			data-grabbed={isGrabbed ? "" : undefined}
			className={cn("wg-kit-slider-thumb", isGrabbed && "is-grabbed")}
			style={thumbStyleOf(at)}
			onKeyDown={onKeyDown}
			onFocus={(event: FocusEvent<HTMLElement>) => onFocusVisible(event.currentTarget.matches(":focus-visible"))}
			onBlur={() => onFocusVisible(false)}
		/>
	);
}

function thumbStyleOf(at: BarCursor | undefined): TokenStyle {
	return { "--wg-slider-at": `${at ? at.x + at.width / 2 : 0}px` };
}
