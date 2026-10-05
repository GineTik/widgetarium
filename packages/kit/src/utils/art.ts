import { ART_TONES } from "../constants/art";
import type { BadgeColor } from "../constants/tones";
import type { TokenStyle } from "./token-style";

export function toneOfIndex(index: number): BadgeColor {
	return ART_TONES[((index % ART_TONES.length) + ART_TONES.length) % ART_TONES.length] ?? "purple";
}

export function artInksOf(tones: readonly BadgeColor[] | undefined, size: number): TokenStyle {
	const first = tones?.[0] ?? "purple";
	const second = tones?.[1] ?? first;
	return {
		"--wg-art-a": `var(--wg-kit-${first})`,
		"--wg-art-b": `var(--wg-kit-${second})`,
		"--wg-art-size": `${size}px`,
	};
}
