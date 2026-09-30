import { isPainted, ROW } from "@widgetarium/kit/plates";
import {
	CORNER_STEP_PX,
	MIN_CORNER_PX,
	MIN_GAP_PX,
	PLATE_CORNER_PX,
	STEP_PX,
	SURFACE_PAD_PX,
	SWAP,
	TEXT_ROLE,
} from "./tree-constants.js";
import { isBox, isLeaf } from "./tree-nodes.js";
import type { AskLeaf, BoxDirection, BoxNode, EdgeSide, HeldNode, NodePath } from "./tree-nodes.js";

export interface Space {
	readonly level: number;
	readonly ask: AskLeaf;
}

export interface Facing {
	readonly isPlate: boolean;
	readonly inset: number;
}

export interface Plate {
	readonly corner: number;
	readonly kitPlate: number;
	readonly kitItem: number;
}

export interface GapVars {
	readonly "--wg-gap-items": string;
	readonly "--wg-gap-parts": string;
	readonly "--wg-gap-cards": string;
}

type Worn = { readonly surface?: string | undefined } | null | undefined;

const [, , DEEPEST_STEP_PX] = STEP_PX;

export const insetOf = (node: Worn): number => (isPainted(node) ? SURFACE_PAD_PX : 0);

export const stepOf = (level: number): number =>
	STEP_PX[Math.min(Math.max(level, 0), STEP_PX.length - 1)] ?? DEEPEST_STEP_PX;

export const cardsGapOf = (seen: number): number => Math.max(seen - SURFACE_PAD_PX, MIN_GAP_PX);

export function gapVarsOf(level: number): GapVars {
	return {
		"--wg-gap-items": `${stepOf(level)}px`,
		"--wg-gap-parts": `${stepOf(level + 1)}px`,
		"--wg-gap-cards": `${cardsGapOf(stepOf(level))}px`,
	};
}

// TRADE-OFF: a height read before the board is drawn counts every gap at the region's step with nothing measured, because no drawn width or widget stands behind it yet
export const UNDRAWN_SPACE: Space = { level: 0, ask: () => ({}) };

export function seenGapOf(box: BoxNode, at: number, space: Space): number {
	const isCloser = holdsPeers(box, space.ask) || isHeading(box.of[at], space.ask);
	return stepOf(isCloser ? space.level + 1 : space.level);
}

const START_SIDES: ReadonlySet<EdgeSide> = new Set(["left", "top"]);

const BARE_EDGE: Facing = { isPlate: false, inset: 0 };

const PLATE_EDGE: Facing = { isPlate: true, inset: 0 };

export function facingOf(node: HeldNode, side: EdgeSide, ask: AskLeaf): Facing {
	if (!node) return BARE_EDGE;
	if (isPainted(node)) return PLATE_EDGE;
	if (!isBox(node)) return { isPlate: false, inset: ask(node.id).insets?.[side] ?? 0 };
	if (node.of.length === 0 || node.dir === SWAP) return BARE_EDGE;
	if (isAlong(node.dir, side))
		return facingOf(START_SIDES.has(side) ? node.of[0] : node.of[node.of.length - 1], side, ask);
	const faces = node.of.map((child) => facingOf(child, side, ask));
	return { isPlate: faces.every((face) => face.isPlate), inset: Math.min(...faces.map((face) => face.inset)) };
}

export function pairGapOf(box: BoxNode, at: number, space: Space, dir: BoxDirection = box.dir): number {
	const [end, start] = dir === ROW ? (["right", "left"] as const) : (["bottom", "top"] as const);
	const before = facingOf(box.of[at], end, space.ask);
	const after = facingOf(box.of[at + 1], start, space.ask);
	const seen = seenGapOf(box, at, space);
	if (before.isPlate && after.isPlate) return cardsGapOf(seen);
	return Math.max(seen - before.inset - after.inset, MIN_GAP_PX);
}

export function gapsOf(box: BoxNode, space: Space, dir: BoxDirection = box.dir): number[] {
	return box.of.slice(1).map((_child, at) => pairGapOf(box, at, space, dir));
}

export function innerWidthOf(box: BoxNode, width: number, space: Space): number {
	return width - gapsOf(box, space, ROW).reduce((sum, one) => sum + one, 0);
}

export function levelAt(root: BoxNode, path: NodePath): number {
	const [first, ...rest] = path;
	if (first === undefined) return 0;
	let node = root.of[first];
	let level = 0;
	for (const step of rest) {
		if (!isBox(node)) return level;
		if (node.dir !== SWAP) level += 1;
		node = node.of[step];
	}
	return level;
}

export function cornerOf(plates: number): number {
	return Math.max(PLATE_CORNER_PX - (plates - 1) * CORNER_STEP_PX, MIN_CORNER_PX);
}

export function plateOf(plates: number): Plate {
	return { corner: cornerOf(plates), kitPlate: cornerOf(plates + 1), kitItem: cornerOf(plates + 2) };
}

function holdsPeers(box: BoxNode, ask: AskLeaf): boolean {
	const leaves = box.of.filter(isLeaf);
	if (box.of.length < 2 || leaves.length !== box.of.length) return false;
	const widgets = new Set(leaves.map((child) => ask(child.id).widget));
	return widgets.size === 1 && !widgets.has(undefined);
}

const isHeading = (node: HeldNode, ask: AskLeaf): boolean => isLeaf(node) && ask(node.id).role === TEXT_ROLE;

const isAlong = (dir: BoxDirection, side: EdgeSide): boolean =>
	dir === ROW ? side === "left" || side === "right" : side === "top" || side === "bottom";
