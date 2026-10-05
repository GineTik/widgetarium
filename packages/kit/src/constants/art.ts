import type { BadgeColor } from "./tones";

export type ArtShape = "orb" | "coin" | "prism" | "cube" | "discs" | "capsules" | "blocks" | "halo" | "ring";

export const ART_SHAPES: readonly ArtShape[] = [
	"orb",
	"coin",
	"prism",
	"cube",
	"discs",
	"capsules",
	"blocks",
	"halo",
	"ring",
];

export const ART_TONES: readonly BadgeColor[] = ["orange", "pink", "purple", "blue", "cyan", "green", "yellow", "red"];

export const ART_SIZE_PX = 64;

export const CAPSULES_AT_MOST = 24;

export const CONFETTI_PIECES = 7;
