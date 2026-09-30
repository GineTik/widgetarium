import type { ReactNode } from "react";
import { PROGRESS_MAX } from "../constants/progress";
import type { ProgressState } from "../constants/progress";

export interface RangeAria {
	readonly "aria-valuemin": number;
	readonly "aria-valuemax": number;
	readonly "aria-valuenow": number;
}

export interface ProgressReading {
	readonly value: number;
	readonly state: ProgressState;
}

export type DisplayValue = ReactNode | ((reading: ProgressReading) => ReactNode);

export function clampPercent(value: unknown): number {
	const asked = Number(value);
	if (!Number.isFinite(asked)) return 0;
	return Math.min(PROGRESS_MAX, Math.max(0, Math.round(asked)));
}

export function rangeAria(shown: number): RangeAria {
	return { "aria-valuemin": 0, "aria-valuemax": PROGRESS_MAX, "aria-valuenow": shown };
}

export function progressState(shown: number): ProgressState {
	if (shown <= 0) return "empty";
	if (shown >= PROGRESS_MAX) return "done";
	return "running";
}

export function shownValue(displayValue: DisplayValue, shown: number): ReactNode {
	if (typeof displayValue !== "function") return displayValue ?? null;
	return displayValue({ value: shown, state: progressState(shown) }) ?? null;
}
