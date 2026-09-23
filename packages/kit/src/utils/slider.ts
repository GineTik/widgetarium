import { PROGRESS_MAX, PROGRESS_STEPS } from "../constants/progress";
import { clampPercent, rangeAria } from "./progress";

export function sliderPropsOf(shown, report) {
	return {
		role: "slider",
		tabIndex: 0,
		...rangeAria(shown),
		onKeyDown: (event) => report(keyedPercent(event, shown)),
	};
}

function keyedPercent(event, shown) {
	if (event.key === "Home") return 0;
	if (event.key === "End") return PROGRESS_MAX;
	const by = PROGRESS_STEPS[event.key];
	if (by === undefined) return null;
	event.preventDefault();
	return clampPercent(shown + by);
}

export function percentUnder(track, event) {
	const box = track?.getBoundingClientRect();
	if (!box?.width) return null;
	return clampPercent(((event.clientX - box.left) / box.width) * PROGRESS_MAX);
}
