import { TONE_NAMES, type ToneName } from "widgetarium/kit";

export function toneNamed(word: string | undefined): ToneName {
	return TONE_NAMES.find((name) => name === word) ?? "neutral";
}
