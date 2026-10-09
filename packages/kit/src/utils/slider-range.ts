import { clamp } from "./clamp";
import { PROGRESS_STEPS } from "../constants/progress";
import type { PointerSpot } from "./pointer-axis";

export interface SliderScale {
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly minStepsBetweenThumbs: number;
}

export type SliderOrientation = "horizontal" | "vertical";

export interface RangeSliderAsk {
	readonly value?: readonly number[] | undefined;
	readonly defaultValue?: readonly number[] | undefined;
	readonly onValueChange?: ((value: number[]) => void) | undefined;
	readonly onValueCommit?: ((value: number[]) => void) | undefined;
	readonly scale: SliderScale;
	readonly orientation: SliderOrientation;
	readonly inverted: boolean;
	readonly disabled: boolean;
}

export interface SliderSettings {
	readonly value?: readonly number[] | undefined;
	readonly defaultValue?: readonly number[] | undefined;
	readonly onValueChange?: ((value: number[]) => void) | undefined;
	readonly onValueCommit?: ((value: number[]) => void) | undefined;
	readonly min?: number | undefined;
	readonly max?: number | undefined;
	readonly step?: number | undefined;
	readonly minStepsBetweenThumbs?: number | undefined;
	readonly orientation?: SliderOrientation | undefined;
	readonly inverted?: boolean | undefined;
	readonly disabled?: boolean | undefined;
}

export interface TrackAsk {
	readonly track: Element | null;
	readonly orientation: SliderOrientation;
	readonly inverted: boolean;
}

export interface KeyedAsk {
	readonly key: string;
	readonly isShift: boolean;
	readonly value: number;
}

interface SpotOnTrack {
	readonly along: number;
	readonly length: number;
}

const PERCENT = 100;

const BIG_STEPS = 10;

const HORIZONTAL_SWAP: ReadonlyMap<string, string> = new Map([
	["ArrowLeft", "ArrowRight"],
	["ArrowRight", "ArrowLeft"],
]);

const VERTICAL_SWAP: ReadonlyMap<string, string> = new Map([
	["ArrowUp", "ArrowDown"],
	["ArrowDown", "ArrowUp"],
]);

const SPOT_ON_TRACK: Readonly<Record<SliderOrientation, (spot: PointerSpot, box: DOMRect) => SpotOnTrack>> = {
	horizontal: (spot, box) => ({ along: spot.clientX - box.left, length: box.width }),
	vertical: (spot, box) => ({ along: box.bottom - spot.clientY, length: box.height }),
};

export function sliderAskOf<P extends SliderSettings>(props: P) {
	const { value, defaultValue, onValueChange, onValueCommit, min = 0, max = 100, step = 1, ...more } = props;
	const { minStepsBetweenThumbs = 0, orientation = "horizontal", inverted = false, disabled = false, ...rest } = more;
	const ask: RangeSliderAsk = {
		value,
		defaultValue,
		onValueChange,
		onValueCommit,
		scale: { min, max, step, minStepsBetweenThumbs },
		orientation,
		inverted,
		disabled,
	};
	return { ask, rest };
}

export function uprightKeyOf(key: string, orientation: SliderOrientation, inverted: boolean): string {
	if (!inverted) return key;
	const swapped = orientation === "vertical" ? VERTICAL_SWAP : HORIZONTAL_SWAP;
	return swapped.get(key) ?? key;
}

export function sliderPercentOf(value: number, scale: SliderScale): number {
	const span = scale.max - scale.min;
	return span === 0 ? 0 : ((value - scale.min) / span) * PERCENT;
}

export function sliderShareOf(value: number, scale: SliderScale): number {
	return sliderPercentOf(value, scale) / PERCENT;
}

export function valueUnder(spot: PointerSpot, ask: TrackAsk, scale: SliderScale): number | null {
	const box = ask.track?.getBoundingClientRect();
	if (!box) return null;
	const { along, length } = SPOT_ON_TRACK[ask.orientation](spot, box);
	if (!length) return null;
	const fraction = clamp(along / length, 0, 1);
	return snapToStep(scale.min + (ask.inverted ? 1 - fraction : fraction) * (scale.max - scale.min), scale);
}

export function nearestThumb(values: readonly number[], value: number): number {
	let nearest = 0;
	values.forEach((held, at) => {
		const distance = Math.abs(held - value);
		const best = Math.abs((values[nearest] ?? held) - value);
		if (distance < best || (distance === best && value > held)) nearest = at;
	});
	return nearest;
}

export function withThumbAt(values: readonly number[], at: number, value: number, scale: SliderScale): number[] {
	const gap = scale.minStepsBetweenThumbs * scale.step;
	const floor = at > 0 ? (values[at - 1] ?? scale.min) + gap : scale.min;
	const ceiling = at < values.length - 1 ? (values[at + 1] ?? scale.max) - gap : scale.max;
	const placed = clamp(snapToStep(value, scale), floor, ceiling);
	return values.map((held, index) => (index === at ? placed : held));
}

export function keyedValue({ key, isShift, value }: KeyedAsk, scale: SliderScale): number | null {
	if (key === "Home") return scale.min;
	if (key === "End") return scale.max;
	const steps = PROGRESS_STEPS.get(key);
	if (steps === undefined) return null;
	const multiplier = isShift && Math.abs(steps) === 1 ? BIG_STEPS : 1;
	return snapToStep(value + steps * multiplier * scale.step, scale);
}

function snapToStep(value: number, scale: SliderScale): number {
	const steps = Math.round((value - scale.min) / scale.step);
	const decimals = decimalsOf(scale.step);
	const near = Number((scale.min + steps * scale.step).toFixed(decimals));
	return clamp(near, scale.min, scale.max);
}

function decimalsOf(step: number): number {
	return (String(step).split(".")[1] ?? "").length;
}
