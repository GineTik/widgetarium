import type { WordChoice } from "../utils/surface";

export type SkeletonButtonSize = "s" | "m" | "l";

export type SkeletonFieldSize = "s" | "m";

export const SKELETON_TEXT_LINES = 3;

export const SKELETON_CARD_LINES = 2;

export const SKELETON_CHART_BARS: readonly number[] = [40, 85, 60, 25, 55, 70, 45];

export const SKELETON_BUTTON_SIZE_WORD: WordChoice<SkeletonButtonSize> = {
	kind: "button skeleton size",
	allowed: ["s", "m", "l"],
	fallback: "m",
};

export const SKELETON_FIELD_SIZE_WORD: WordChoice<SkeletonFieldSize> = {
	kind: "field skeleton size",
	allowed: ["s", "m"],
	fallback: "m",
};
