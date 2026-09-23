import { TONE_NAMES } from "./tones";

export const MARK_VIEW_BOX = "0 0 48 48";

export const MARK_SHAPES = {
	disc: "M24 6a18 18 0 1 0 0 36 18 18 0 0 0 0-36Z",
	ring: "M24 6a18 18 0 1 0 0 36 18 18 0 0 0 0-36Zm0 11a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z",
	diamond: "M24 5 43 24 24 43 5 24Z",
	triangle: "M24 6 42 40 6 40Z",
	hexagon: "M24 5 40.4 14.5v19L24 43 7.6 33.5v-19Z",
	squircle: "M15 6h18a9 9 0 0 1 9 9v18a9 9 0 0 1-9 9H15a9 9 0 0 1-9-9V15a9 9 0 0 1 9-9Z",
	arch: "M6 42V24a18 18 0 0 1 36 0v18Z",
	quarter: "M6 42V6h36a36 36 0 0 1-36 36Z",
	cross: "M19 6h10v13h13v10H29v13H19V29H6V19h13Z",
	star: "M24 5c1.6 10.2 7.8 16.4 18 18-10.2 1.6-16.4 7.8-18 18-1.6-10.2-7.8-16.4-18-18 10.2-1.6 16.4-7.8 18-18Z",
	capsule: "M15 14h18a10 10 0 0 1 0 20H15a10 10 0 0 1 0-20Z",
	quatrefoil:
		"M24 6a9 9 0 0 1 9 9 9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9-9Z",
};

export const MARK_SHAPE_NAMES = Object.keys(MARK_SHAPES);

export const MARK_TONE_NAMES = TONE_NAMES.filter((name) => name !== "error" && name !== "neutral");

export const SHAPE_STREAM = 0x9e3779b9;

export const TONE_STREAM = 0x85ebca6b;
