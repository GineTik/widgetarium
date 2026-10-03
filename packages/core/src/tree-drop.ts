import { COLUMN, ROW } from "@widgetarium/kit/plates";
import { SWAP } from "./tree-constants.js";
import { insertAt, isGap, nodeAt, pathOfLeaf, prune, replaceAt, withGapAt } from "./tree-nodes.js";
import type { Axis, BoardNode, BoxNode, LeafNode, NodePath } from "./tree-nodes.js";

export interface Rect {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

export interface Spot {
	readonly path: NodePath;
	readonly kind: "box" | "leaf";
	readonly dir: string | null;
	readonly box: Rect;
}

type DropSide = "before" | "after";

interface BesideTarget {
	readonly kind: "beside";
	readonly box: NodePath;
	readonly at: number;
}

interface WrapTarget {
	readonly kind: "wrap";
	readonly path: NodePath;
	readonly axis: Axis;
	readonly side: DropSide;
}

export type DropTarget = BesideTarget | WrapTarget;

interface Pointer {
	readonly x: number;
	readonly y: number;
}

interface Edge {
	readonly axis: Axis;
	readonly side: DropSide;
}

const ROW_EDGE_SHARE = 0.28;

const ROW_EDGE_CEILING_PX = 64;

export function targetAt(spots: readonly Spot[], x: number, y: number): DropTarget | null {
	const pointer = { x, y };
	const [over] = spots
		.filter((spot) => isOver(spot, pointer))
		.sort((one, other) => other.path.length - one.path.length);
	if (!over) return null;
	if (over.dir === SWAP) return targetInSwap(spots, over, pointer);
	if (over.kind === "box") return { kind: "beside", box: over.path, at: slotIn(spots, over, pointer) };
	return besideOrWrap(spots, over, pointer);
}

export function sameTarget(one: DropTarget | null | undefined, other: DropTarget | null | undefined): boolean {
	if (!one || !other) return one === other;
	if (one.kind === "wrap")
		return (
			other.kind === "wrap" && samePath(one.path, other.path) && one.axis === other.axis && one.side === other.side
		);
	return other.kind === "beside" && samePath(one.box, other.box) && one.at === other.at;
}

const NOTHING_AT_PATH = "Widgetarium: no box stands at {path}, so the tile was left where it was.";

export function moveInto(root: BoxNode, id: string, target: DropTarget | null | undefined): BoxNode {
	const from = pathOfLeaf(root, id);
	if (from === null || !target) return root;
	const held = nodeAt(root, from);
	if (held === null) return root;
	const blanked = withGapAt(root, from);
	if (target.kind === "wrap") {
		const wrapped = nodeAt(blanked, target.path);
		if (!wrapped || isGap(wrapped)) return root;
		return prune(replaceAt(blanked, target.path, wrapping(wrapped, held, target)));
	}
	const grown = insertAt(blanked, target.box, target.at, held);
	if (grown === null) {
		console.warn(NOTHING_AT_PATH.replace("{path}", target.box.join("/")));
		return root;
	}
	return prune(grown);
}

export function placeInto(root: BoxNode, leaf: LeafNode, target: DropTarget | null | undefined): BoxNode {
	const held = insertAt(root, [], root.of.length, leaf);
	if (!held || !target) return root;
	const placed = moveInto(held, leaf.id, target);
	return placed === held ? root : placed;
}

const samePath = (one: NodePath, other: NodePath): boolean =>
	one.length === other.length && one.every((step, at) => step === other[at]);

const isWithin = (path: NodePath, of: NodePath): boolean =>
	path.length > of.length && samePath(path.slice(0, of.length), of);

function edgeOf(box: Rect, pointer: Pointer): Edge | null {
	const acrossEdge = Math.min((box.right - box.left) * ROW_EDGE_SHARE, ROW_EDGE_CEILING_PX);
	const downEdge = Math.min((box.bottom - box.top) * ROW_EDGE_SHARE, ROW_EDGE_CEILING_PX);
	if (pointer.y < box.top + downEdge) return { axis: COLUMN, side: "before" };
	if (pointer.y > box.bottom - downEdge) return { axis: COLUMN, side: "after" };
	if (pointer.x < box.left + acrossEdge) return { axis: ROW, side: "before" };
	if (pointer.x > box.right - acrossEdge) return { axis: ROW, side: "after" };
	return null;
}

const isPastMiddle = (box: Rect, dir: string | null, pointer: Pointer): boolean =>
	dir === COLUMN ? pointer.y > (box.top + box.bottom) / 2 : pointer.x > (box.left + box.right) / 2;

function slotIn(spots: readonly Spot[], box: Spot, pointer: Pointer): number {
	return childrenOf(spots, box).filter((spot) => isPastMiddle(spot.box, box.dir, pointer)).length;
}

const isOver = (spot: Spot, pointer: Pointer): boolean =>
	pointer.x >= spot.box.left &&
	pointer.x <= spot.box.right &&
	pointer.y >= spot.box.top &&
	pointer.y <= spot.box.bottom;

function besideOrWrap(spots: readonly Spot[], over: Spot, pointer: Pointer): DropTarget {
	const parent = over.path.slice(0, -1);
	const dir = spots.find((spot) => samePath(spot.path, parent))?.dir ?? COLUMN;
	const edge = edgeOf(over.box, pointer);
	if (edge && edge.axis !== dir) return { kind: "wrap", path: over.path, axis: edge.axis, side: edge.side };
	const side = edge?.side ?? (isPastMiddle(over.box, dir, pointer) ? "after" : "before");
	const at = over.path[over.path.length - 1] ?? 0;
	return { kind: "beside", box: parent, at: side === "after" ? at + 1 : at };
}

const childrenOf = (spots: readonly Spot[], box: Spot): Spot[] =>
	spots.filter((spot) => spot.path.length === box.path.length + 1 && isWithin(spot.path, box.path));

// TRADE-OFF: a swap box takes no sibling, because a child of it is a NAMED view and a drop names nothing — so the aim falls through to the view on screen, where it can only wrap
function targetInSwap(spots: readonly Spot[], over: Spot, pointer: Pointer): DropTarget | null {
	const [shown] = childrenOf(spots, over);
	return shown ? besideOrWrap(spots, shown, pointer) : null;
}

// TRADE-OFF: ratio, name and hidden are facts about the child's PLACE in its parent, so they stay on the wrapper; leaving the name inside would take a view's name off the box that swaps it
function wrapping(node: BoardNode, held: BoardNode, { axis, side }: WrapTarget): BoxNode {
	const { ratio, name, hidden, ...inner } = node;
	return {
		dir: axis,
		...(ratio === undefined ? {} : { ratio }),
		...(name === undefined ? {} : { name }),
		...(hidden === undefined ? {} : { hidden }),
		of: side === "before" ? [held, inner] : [inner, held],
	};
}
