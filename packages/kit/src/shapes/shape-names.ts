import type { BadgeColor } from "../constants/tones";
import { SHAPE_TABLE } from "./shape-table";

export type ShapeName = keyof typeof SHAPE_TABLE;

export type ShapeLook = "flat" | "3d";

export const SHAPE_NAMES = Object.keys(SHAPE_TABLE) as readonly ShapeName[];

export const SHAPE_TONES: readonly BadgeColor[] = [
	"purple",
	"pink",
	"orange",
	"yellow",
	"green",
	"cyan",
	"blue",
	"red",
];

export const SHAPE_SIZE_PX = 64;

export const SHAPE_NAME_STREAM = 0x27d4eb2f;

export const SHAPE_TONE_STREAM = 0x165667b1;
