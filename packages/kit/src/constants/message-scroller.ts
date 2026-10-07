import type { WordChoice } from "../utils/surface";

export type ScrollPosition = "start" | "end" | "last-anchor";

export type ScrollDirection = "start" | "end";

export const SCROLL_POSITION_WORD: WordChoice<ScrollPosition> = {
	kind: "scroll position",
	allowed: ["start", "end", "last-anchor"],
	fallback: "end",
};

export const SCROLL_DIRECTION_WORD: WordChoice<ScrollDirection> = {
	kind: "scroll direction",
	allowed: ["start", "end"],
	fallback: "end",
};

export const SCROLL_EDGE_THRESHOLD_PX = 8;

export const SCROLL_PREVIOUS_ITEM_PEEK_PX = 64;

export const AUTOSCROLL_SETTLE_MS = 900;

export const RELEASE_KEYS: readonly string[] = ["ArrowUp", "PageUp", "Home"];

export const MESSAGE_ID_ATTRIBUTE = "data-message-id";

export const SCROLL_ANCHOR_ATTRIBUTE = "data-scroll-anchor";

export const MESSAGES_LABEL = "Messages";

export const SCROLL_BUTTON_LABELS: Readonly<Record<ScrollDirection, string>> = {
	end: "Scroll to the latest message",
	start: "Scroll to the first message",
};

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
