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

export const insetOf = (node) => (isPainted(node) ? SURFACE_PAD_PX : 0);

export const stepOf = (level) => STEP_PX[Math.min(Math.max(level, 0), STEP_PX.length - 1)];

export const cardsGapOf = (seen) => Math.max(seen - SURFACE_PAD_PX, MIN_GAP_PX);

export function gapVarsOf(level) {
	return {
		"--wg-gap-items": `${stepOf(level)}px`,
		"--wg-gap-parts": `${stepOf(level + 1)}px`,
		"--wg-gap-cards": `${cardsGapOf(stepOf(level))}px`,
	};
}

// TRADE-OFF: a height read before the board is drawn counts every gap at the region's step with nothing measured, because no drawn width or widget stands behind it yet
export const UNDRAWN_SPACE = { level: 0, ask: () => ({}) };

export function seenGapOf(box, at, space) {
	const isCloser = holdsPeers(box, space.ask) || isHeading(box.of[at], space.ask);
	return stepOf(isCloser ? space.level + 1 : space.level);
}

const START_SIDES = new Set(["left", "top"]);

const BARE_EDGE = { isPlate: false, inset: 0 };

const PLATE_EDGE = { isPlate: true, inset: 0 };

export function facingOf(node, side, ask) {
	if (!node) return BARE_EDGE;
	if (isPainted(node)) return PLATE_EDGE;
	if (!isBox(node)) return { isPlate: false, inset: ask(node.id).insets?.[side] ?? 0 };
	if (node.of.length === 0 || node.dir === SWAP) return BARE_EDGE;
	if (isAlong(node.dir, side))
		return facingOf(START_SIDES.has(side) ? node.of[0] : node.of[node.of.length - 1], side, ask);
	const faces = node.of.map((child) => facingOf(child, side, ask));
	return { isPlate: faces.every((face) => face.isPlate), inset: Math.min(...faces.map((face) => face.inset)) };
}

export function pairGapOf(box, at, space, dir = box.dir) {
	const [end, start] = dir === ROW ? ["right", "left"] : ["bottom", "top"];
	const before = facingOf(box.of[at], end, space.ask);
	const after = facingOf(box.of[at + 1], start, space.ask);
	const seen = seenGapOf(box, at, space);
	if (before.isPlate && after.isPlate) return cardsGapOf(seen);
	return Math.max(seen - before.inset - after.inset, MIN_GAP_PX);
}

export function gapsOf(box, space, dir = box.dir) {
	return box.of.slice(1).map((child, at) => pairGapOf(box, at, space, dir));
}

export function innerWidthOf(box, width, space) {
	return width - gapsOf(box, space, ROW).reduce((sum, one) => sum + one, 0);
}

export function levelAt(root, path) {
	let node = root.of[path[0]];
	let level = 0;
	for (const step of path.slice(1)) {
		if (node.dir !== SWAP) level += 1;
		node = node.of[step];
	}
	return level;
}

export function cornerOf(plates) {
	return Math.max(PLATE_CORNER_PX - (plates - 1) * CORNER_STEP_PX, MIN_CORNER_PX);
}

export function plateOf(plates) {
	return { corner: cornerOf(plates), kitPlate: cornerOf(plates + 1), kitItem: cornerOf(plates + 2) };
}

function holdsPeers(box, ask) {
	if (box.of.length < 2 || !box.of.every(isLeaf)) return false;
	const widgets = new Set(box.of.map((child) => ask(child.id).widget));
	return widgets.size === 1 && !widgets.has(undefined);
}

const isHeading = (node, ask) => isLeaf(node) && ask(node.id).role === TEXT_ROLE;

const isAlong = (dir, side) =>
	dir === ROW ? side === "left" || side === "right" : side === "top" || side === "bottom";
