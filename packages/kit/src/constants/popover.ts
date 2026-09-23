export const PRESS_EVENTS = ["pointerdown", "mousedown"];

export const EXIT_GUARD_MS = 400;

export const GROW_MS = 420;

export const CONTENT_MS = 240;

export const CONTENT_DELAY_MS = 80;

export const LAND_MARGIN_MS = 40;

const ANCHOR_GAP_PX = 6;

export const PLACEMENTS = {
	over: {
		panelClass: "",
		hidesTrigger: true,
		origin: (rect) => ({ left: rect.left, top: rect.top }),
		flipped: (rect, size) => ({ left: rect.right - size.width, top: rect.bottom - size.height }),
	},
	below: {
		panelClass: "is-below",
		hidesTrigger: false,
		origin: (rect) => ({ left: rect.left, top: rect.bottom + ANCHOR_GAP_PX }),
		flipped: (rect, size) => ({ left: rect.right - size.width, top: rect.top - ANCHOR_GAP_PX - size.height }),
	},
};
