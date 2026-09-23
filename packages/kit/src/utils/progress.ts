import { PROGRESS_MAX } from "../constants/progress";

export function clampPercent(value) {
	const asked = Number(value);
	if (!Number.isFinite(asked)) return 0;
	return Math.min(PROGRESS_MAX, Math.max(0, Math.round(asked)));
}

export function rangeAria(shown) {
	return { "aria-valuemin": "0", "aria-valuemax": String(PROGRESS_MAX), "aria-valuenow": String(shown) };
}

export function progressState(shown) {
	if (shown <= 0) return "empty";
	if (shown >= PROGRESS_MAX) return "done";
	return "running";
}

export function shownValue(displayValue, shown) {
	if (typeof displayValue !== "function") return displayValue ?? null;
	return displayValue({ value: shown, state: progressState(shown) }) ?? null;
}
