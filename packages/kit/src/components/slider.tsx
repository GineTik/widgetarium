import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useRangeSlider } from "../hooks/use-range-slider";
import { cn } from "../utils/cn";
import { sliderPercentOf, sliderAskOf } from "../utils/slider-range";
import type { SliderSettings } from "../utils/slider-range";
import type { TokenStyle } from "../utils/token-style";
import type { RangeSliderPointer } from "../hooks/use-range-slider";
import type { PointerEvent } from "react";
import { SliderThumb } from "./slider-thumb";

export interface SliderProps
	extends Omit<HTMLAttributes<HTMLSpanElement>, "defaultValue" | "onChange" | "dir">, SliderSettings {}

export function Slider({ className, ...props }: SliderProps): ReactElement {
	const { ask, rest } = sliderAskOf(props);
	const slider = useRangeSlider(ask);
	const percents = slider.values.map((held) => sliderPercentOf(held, ask.scale));
	return (
		<span
			data-slot="slider"
			data-orientation={ask.orientation}
			data-disabled={ask.disabled ? "" : undefined}
			aria-disabled={ask.disabled || undefined}
			{...rest}
			{...mergePointer(rest, slider.pointer)}
			className={cn(
				"wg-kit-slider",
				`is-${ask.orientation}`,
				ask.inverted && "is-inverted",
				slider.grabbed !== null && "is-grabbed",
				className,
			)}
		>
			<span data-slot="slider-track" className="wg-kit-slider-track" ref={slider.trackRef}>
				<span data-slot="slider-range" className="wg-kit-slider-range" style={rangeStyleOf(percents)} />
			</span>
			{slider.values.map((held, at) => (
				<SliderThumb
					key={at}
					value={held}
					percent={percents[at] ?? 0}
					scale={ask.scale}
					orientation={ask.orientation}
					disabled={ask.disabled}
					isGrabbed={slider.grabbed === at}
					onKeyDown={slider.keysOf(at)}
				/>
			))}
		</span>
	);
}

function rangeStyleOf(percents: readonly number[]): TokenStyle {
	const from = percents.length > 1 ? Math.min(...percents) : 0;
	return { "--wg-slider-from": `${from}%`, "--wg-slider-to": `${Math.max(0, ...percents)}%` };
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
