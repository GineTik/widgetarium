import { TONE_CLASSES } from "../constants/tones";
import { cn, variants } from "./cn";

const BUTTON_WORDS = {
	variant: { accent: "is-accent", neutral: "", ghost: "is-ghost", plain: "is-plain", danger: "is-danger" },
	size: { l: "is-l", m: "is-m", s: "is-s" },
	block: { true: "is-block" },
};

const ICON_BUTTON_WORDS = {
	variant: { accent: "is-accent", neutral: "", raised: "is-raised", ghost: "is-ghost", glass: "wg-kit-glass" },
	size: { l: "is-l", m: "is-m", s: "is-s", xs: "is-xs" },
};

const PILL_WORDS = {
	tone: TONE_CLASSES,
	variant: { soft: "", solid: "is-solid", outline: "is-outline", dot: "is-dot", text: "is-text" },
	size: { s: "is-s", m: "" },
};

const CARD_WORDS = {
	variant: { light: "", solid: "is-solid" },
	lift: { true: "is-lifted" },
	selected: { true: "is-selected" },
};

const SIDEBAR_WORDS = { mode: { full: "", minimal: "is-minimal" }, surface: { solid: "", glass: "is-glass" } };

const FIELD_WORDS = { size: { m: "", s: "is-s" }, block: { true: "is-block" } };

export type ButtonVariant = keyof (typeof BUTTON_WORDS)["variant"];

export type ButtonSize = keyof (typeof BUTTON_WORDS)["size"];

export type IconButtonVariant = keyof (typeof ICON_BUTTON_WORDS)["variant"];

export type IconButtonSize = keyof (typeof ICON_BUTTON_WORDS)["size"];

export type PillVariant = keyof (typeof PILL_WORDS)["variant"];

export type PillSize = keyof (typeof PILL_WORDS)["size"];

export type SidebarMode = keyof (typeof SIDEBAR_WORDS)["mode"];

export type SidebarSurface = keyof (typeof SIDEBAR_WORDS)["surface"];

export type FieldSize = keyof (typeof FIELD_WORDS)["size"];

export const buttonClass = variants("wg-kit-btn", BUTTON_WORDS, { variant: "neutral", size: "m" });

export const iconButtonClass = variants("wg-kit-icon", ICON_BUTTON_WORDS, { variant: "neutral", size: "m" });

export const pillClass = variants("wg-kit-pill wg-kit-inked", PILL_WORDS, {
	tone: "neutral",
	variant: "soft",
	size: "m",
});

export const cardClass = variants("wg-kit-card", CARD_WORDS, { variant: "light" });

export const plateClass = variants(cn("wg-kit-plate", cardClass({ variant: "solid" })), {});

export const listClass = variants(cn("wg-kit-list", cardClass({ variant: "solid" })), {});

export const rowClass = variants("wg-kit-row", { pressable: { true: "is-pressable" } });

export const glassClass = variants("wg-kit-glass", {});

export const sidebarClass = variants(cn("wg-kit-side", cardClass({ variant: "light", lift: true })), SIDEBAR_WORDS, {
	mode: "full",
	surface: "solid",
});

export const fieldClass = variants("wg-kit-field", FIELD_WORDS, { size: "m" });
