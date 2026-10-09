export interface ModalIds {
	readonly titleId: string | undefined;
	readonly descriptionId: string | undefined;
}

export const FLOAT_EXIT_MS = 200;

export const MODAL_EXIT_MS = 320;

export const TOOLTIP_DELAY_MS = 0;

export const TOOLTIP_SKIP_DELAY_MS = 300;

export const HOVER_CARD_OPEN_MS = 700;

export const HOVER_CARD_CLOSE_MS = 300;

export const HOVER_GRACE_MS = 120;

export const NAVIGATION_OPEN_MS = 200;

export const HOVER_OPEN_MS = 400;

export const LONG_PRESS_MS = 600;

export const LONG_PRESS_SLOP_PX = 8;

export const TYPEAHEAD_RESET_MS = 500;

export const TOAST_DURATION_MS = 4000;

export const TOAST_EXIT_MS = 240;

export const TOAST_GAP_PX = 14;

export const TOAST_VISIBLE = 3;

export const FOCUSABLE =
	'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const MENU_ITEM = "[data-wg-menu-item]:not([data-disabled])";
