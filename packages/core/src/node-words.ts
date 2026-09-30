import { APART, COLUMN, GROUP, NO_SURFACE, ROW, SURFACE_WAS } from "@widgetarium/kit/plates";
import { COLLAPSES, SWAP, TOGGLES } from "./tree-constants.js";
import type { BoxDirection, CollapseKind, CollapseToggle, SurfaceSide, SurfaceWord } from "./tree-nodes.js";

const SURFACE_WORDS: readonly SurfaceWord[] = [GROUP, APART, NO_SURFACE];
const SURFACE_SIDES: readonly SurfaceSide[] = ["start", "end"];
const DIRECTIONS: readonly BoxDirection[] = [ROW, COLUMN, SWAP];

export function isSurfaceWord(said: unknown): said is SurfaceWord {
	return SURFACE_WORDS.some((word) => word === said);
}

export function isSurfaceSide(said: unknown): said is SurfaceSide {
	return SURFACE_SIDES.some((side) => side === said);
}

export function isBoxDirection(said: unknown): said is BoxDirection {
	return DIRECTIONS.some((dir) => dir === said);
}

export function isCollapseKind(said: unknown): said is CollapseKind {
	return COLLAPSES.some((kind) => kind === said);
}

export function isCollapseToggle(said: unknown): said is CollapseToggle {
	return TOGGLES.some((toggle) => toggle === said);
}

export function surfaceWordOf(said: unknown): SurfaceWord | null {
	const renamed: unknown = Object.entries(SURFACE_WAS).find(([was]) => was === said)?.[1] ?? said;
	return isSurfaceWord(renamed) ? renamed : null;
}
