import { textOf } from "widgetarium";
import { TONE_NAMES } from "widgetarium/kit";

const NEUTRAL = "neutral";

export function toneOf(tier: unknown): string {
	const written = textOf(tier, "tone").trim().toLowerCase();
	return tones().includes(written) ? written : NEUTRAL;
}

export function nextToneAfter(tone: string): string {
	const coloured = colouredTones();
	return coloured[(coloured.indexOf(tone) + 1) % coloured.length] ?? NEUTRAL;
}

// TODO: move the seed-to-tone hash into the kit — @default/kanban-board and @default/filter-panel each carry their own copy
export function toneForSeed(seed: unknown): string {
	const coloured = colouredTones();
	const written = String(seed ?? "");
	let sum = 0;
	for (let at = 0; at < written.length; at += 1) sum = (sum * 31 + written.charCodeAt(at)) % 100003;
	return coloured[sum % coloured.length] ?? NEUTRAL;
}

function tones(): readonly string[] {
	return TONE_NAMES;
}

function colouredTones(): readonly string[] {
	return tones().filter((tone) => tone !== NEUTRAL);
}
