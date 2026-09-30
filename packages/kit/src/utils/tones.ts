import { TONE_CLASSES, TONE_NAMES } from "../constants/tones";
import type { ToneName } from "../constants/tones";
import { cn } from "./cn";
import { isOneOf } from "./is-one-of";
import { warnOnce } from "./surface";

export function toneOf(table: Readonly<Record<string, ToneName>>, value: unknown): ToneName {
	return toneIn(table, String(value ?? "").toLowerCase()) ?? toneIn(table, String(value)) ?? "neutral";
}

export function toneClass(tone: unknown): string {
	if (tone === undefined || tone === null) return TONE_CLASSES.neutral;
	if (isOneOf(TONE_NAMES, tone)) return TONE_CLASSES[tone];
	warnOnce(`${String(tone)} is no tone, so the neutral one was drawn instead: ${TONE_NAMES.join(", ")}`);
	return TONE_CLASSES.neutral;
}

export function inkedClass(tone: unknown): string {
	return cn("wg-kit-inked", toneClass(tone));
}

export function tonedPlateClass(tone: unknown): string | null {
	const toned = tone ? toneClass(tone) : "";
	return toned ? cn("wg-kit-tone", toned) : null;
}

function toneIn(table: Readonly<Record<string, ToneName>>, key: string): ToneName | undefined {
	return Object.hasOwn(table, key) ? table[key] : undefined;
}
