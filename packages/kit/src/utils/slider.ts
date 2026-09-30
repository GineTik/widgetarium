import type { KeyboardEvent } from "react";
import { PROGRESS_MAX, PROGRESS_STEPS } from "../constants/progress";
import { clampPercent, rangeAria } from "./progress";
import type { RangeAria } from "./progress";

export type ReportPercent = (next: number | null) => void;

export interface SliderProps extends RangeAria {
	readonly role: "slider";
	readonly tabIndex: number;
	readonly onKeyDown: (event: KeyboardEvent) => void;
}

export interface PointerSpot {
	readonly clientX: number;
}

export function sliderPropsOf(shown: number, report: ReportPercent): SliderProps {
	return {
		role: "slider",
		tabIndex: 0,
		...rangeAria(shown),
		onKeyDown: (event) => report(keyedPercent(event, shown)),
	};
}

export function percentUnder(track: Element | null, event: PointerSpot): number | null {
	const box = track?.getBoundingClientRect();
	if (!box?.width) return null;
	return clampPercent(((event.clientX - box.left) / box.width) * PROGRESS_MAX);
}

function keyedPercent(event: KeyboardEvent, shown: number): number | null {
	if (event.key === "Home") return 0;
	if (event.key === "End") return PROGRESS_MAX;
	const by = PROGRESS_STEPS.get(event.key);
	if (by === undefined) return null;
	event.preventDefault();
	return clampPercent(shown + by);
}
