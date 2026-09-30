export type ToneName =
	"neutral" | "accent" | "success" | "warning" | "error" | "info" | "note" | "standout" | "highlight";

export type BadgeColor = "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "pink";

export type BadgeVariant = "soft" | "solid" | "outline" | "dot" | "text";

export const PRIORITY_TONES: Readonly<Record<string, ToneName>> = { P1: "error", P2: "warning", P3: "success" };

export const APPROVAL_TONES: Readonly<Record<string, ToneName>> = {
	approve: "success",
	check: "warning",
	reject: "error",
	review: "accent",
};

export const TONE_CLASSES: Readonly<Record<ToneName, string>> = {
	neutral: "",
	accent: "is-accent",
	success: "is-ok",
	warning: "is-warn",
	error: "is-err",
	info: "is-info",
	note: "is-note",
	standout: "is-standout",
	highlight: "is-highlight",
};

export const TONE_NAMES: readonly ToneName[] = [
	"neutral",
	"accent",
	"success",
	"warning",
	"error",
	"info",
	"note",
	"standout",
	"highlight",
];

export const BADGE_VARIANTS: readonly BadgeVariant[] = ["soft", "solid", "outline", "dot", "text"];

export const BADGE_COLORS: readonly BadgeColor[] = [
	"red",
	"orange",
	"yellow",
	"green",
	"cyan",
	"blue",
	"purple",
	"pink",
];
