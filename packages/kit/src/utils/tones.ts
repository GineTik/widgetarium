import { TONE_CLASSES } from "../constants/tones";
import { cx } from "./cx";
import { warnOnce } from "./surface";

export function toneOf(table, value) {
	return table[String(value ?? "").toLowerCase()] ?? table[value] ?? "neutral";
}

export function toneClass(tone) {
	if (tone === undefined || tone === null) return TONE_CLASSES.neutral;
	if (Object.hasOwn(TONE_CLASSES, tone)) return TONE_CLASSES[tone];
	warnOnce(`${tone} is no tone, so the neutral one was drawn instead: ${Object.keys(TONE_CLASSES).join(", ")}`);
	return TONE_CLASSES.neutral;
}

export function inkedClass(tone) {
	return cx("wg-kit-inked", toneClass(tone));
}

export function tonedPlateClass(tone) {
	const toned = tone ? toneClass(tone) : "";
	return toned ? cx("wg-kit-tone", toned) : null;
}
