import { TONE_CLASSES } from "../constants/tones";
import { cx, variants } from "./cx";

export const buttonClass = variants(
	"wg-kit-btn",
	{
		variant: { accent: "is-accent", neutral: "", ghost: "is-ghost", plain: "is-plain", danger: "is-danger" },
		size: { l: "is-l", m: "is-m", s: "is-s" },
		block: { true: "is-block" },
	},
	{ variant: "neutral", size: "m" },
);

export const iconButtonClass = variants(
	"wg-kit-icon",
	{
		variant: { accent: "is-accent", neutral: "", raised: "is-raised", ghost: "is-ghost", glass: "wg-kit-glass" },
		size: { l: "is-l", m: "is-m", s: "is-s", xs: "is-xs" },
	},
	{ variant: "neutral", size: "m" },
);

export const pillClass = variants(
	"wg-kit-pill wg-kit-inked",
	{
		tone: TONE_CLASSES,
		variant: { soft: "", solid: "is-solid", outline: "is-outline", dot: "is-dot", text: "is-text" },
		size: { s: "is-s", m: "" },
	},
	{ tone: "neutral", variant: "soft", size: "m" },
);

export const cardClass = variants(
	"wg-kit-card",
	{ variant: { light: "", solid: "is-solid" }, lift: { true: "is-lifted" }, selected: { true: "is-selected" } },
	{ variant: "light" },
);

export const plateClass = variants(cx("wg-kit-plate", cardClass({ variant: "solid" })), {});

export const listClass = variants(cx("wg-kit-list", cardClass({ variant: "solid" })), {});

export const rowClass = variants("wg-kit-row", { pressable: { true: "is-pressable" } });

export const glassClass = variants("wg-kit-glass", {});

export const sidebarClass = variants(
	cx("wg-kit-side", cardClass({ variant: "light", lift: true })),
	{ mode: { full: "", minimal: "is-minimal" }, surface: { solid: "", glass: "is-glass" } },
	{ mode: "full", surface: "solid" },
);

export const fieldClass = variants(
	"wg-kit-field",
	{ size: { m: "", s: "is-s" }, block: { true: "is-block" } },
	{ size: "m" },
);
