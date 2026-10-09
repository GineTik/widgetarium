import { createElement as h, useState } from "react";
import type { HTMLAttributes, PointerEvent, ReactElement } from "react";
import { CURSOR_HEIGHT } from "../constants/progress";
import { useRangeSlider } from "../hooks/use-range-slider";
import type { RangeSlider, RangeSliderPointer } from "../hooks/use-range-slider";
import { useWidthOf } from "../hooks/use-width-of";
import { cn } from "../utils/cn";
import { sliderGeometry } from "../utils/progress-geometry";
import { sliderAskOf, sliderShareOf } from "../utils/slider-range";
import type { RangeSliderAsk, SliderSettings } from "../utils/slider-range";
import { inkedClass } from "../utils/tones";
import type { TokenStyle } from "../utils/token-style";
import { BarDrawing } from "./bar-drawing";
import { SliderThumb } from "./slider-thumb";

export interface SliderProps
	extends Omit<HTMLAttributes<HTMLSpanElement>, "defaultValue" | "onChange" | "dir">, SliderSettings {}

const THICKNESS: TokenStyle = { "--wg-slider-thickness": `${CURSOR_HEIGHT}px` };

export function Slider({ className, style, ...props }: SliderProps): ReactElement {
	const { ask, rest } = sliderAskOf(props);
	const slider = useRangeSlider(ask);
	const [focusedAt, setFocusedAt] = useState<number | null>(null);
	const length = useWidthOf(slider.trackRef);
	const drawn = sliderGeometry(
		length,
		slider.values.map((held) => sliderShareOf(held, ask.scale)),
	);
	return (
		<span
			data-slot="slider"
			data-orientation={ask.orientation}
			data-disabled={ask.disabled ? "" : undefined}
			aria-disabled={ask.disabled || undefined}
			{...rest}
			{...mergePointer(rest, slider.pointer)}
			style={{ ...style, ...THICKNESS }}
			className={sliderClass(ask, slider, className)}
		>
			<span data-slot="slider-track" className="wg-kit-bar-line" ref={slider.trackRef}>
				{length > 0 && <BarDrawing width={length} drawn={drawn} hasStopMark={false} focusedAt={focusedAt} />}
				{slider.values.map((held, at) => (
					<SliderThumb
						key={at}
						value={held}
						at={drawn.cursors[at]}
						ask={ask}
						isGrabbed={slider.grabbed === at}
						onKeyDown={slider.keysOf(at)}
						onFocusVisible={(isVisible) => setFocusedAt(isVisible ? at : null)}
					/>
				))}
			</span>
		</span>
	);
}

function sliderClass(ask: RangeSliderAsk, slider: RangeSlider, className: string | undefined): string {
	return cn(
		"wg-kit-bar wg-kit-slider is-settable",
		inkedClass("accent"),
		`is-${ask.orientation}`,
		ask.inverted && "is-inverted",
		slider.grabbed !== null && "is-grabbed",
		className,
	);
}

interface OwnPointer {
	readonly onPointerDown?: ((event: PointerEvent<HTMLSpanElement>) => void) | undefined;
	readonly onPointerMove?: ((event: PointerEvent<HTMLSpanElement>) => void) | undefined;
}

function mergePointer(own: OwnPointer, slider: RangeSliderPointer): RangeSliderPointer {
	return {
		onPointerDown: (event: PointerEvent<HTMLSpanElement>) => {
			own.onPointerDown?.(event);
			slider.onPointerDown(event);
		},
		onPointerMove: (event: PointerEvent<HTMLSpanElement>) => {
			own.onPointerMove?.(event);
			slider.onPointerMove(event);
		},
		onPointerUp: () => slider.onPointerUp(),
		onPointerCancel: () => slider.onPointerCancel(),
	};
}
