import { CHART_COLOR_COUNT } from "../constants/charts";
import { BADGE_COLORS, TONE_NAMES } from "../constants/tones";
import { warnOnce } from "./surface";

const NAMED_INKS = [...BADGE_COLORS, ...TONE_NAMES];

export function chartColorOf(asked: unknown, place: number): string {
	const step = (place % CHART_COLOR_COUNT) + 1;
	if (asked === undefined || asked === null || asked === "") return `var(--wg-kit-chart-${step})`;
	const numbered = Number(asked);
	if (Number.isInteger(numbered) && numbered >= 1 && numbered <= CHART_COLOR_COUNT)
		return `var(--wg-kit-chart-${numbered})`;
	if (NAMED_INKS.includes(String(asked))) return `var(--wg-kit-${String(asked)})`;
	warnOnce(
		`${String(asked)} is no chart colour, so chart colour ${step} was drawn instead: 1 to ${CHART_COLOR_COUNT}, ${NAMED_INKS.join(", ")}`,
	);
	return `var(--wg-kit-chart-${step})`;
}

export function seriesColorName(key: string): string {
	return `--color-${String(key).replace(/[^\w-]/g, "-")}`;
}
