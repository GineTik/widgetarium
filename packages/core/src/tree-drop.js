import { COLUMN, ROW } from "@widgetarium/kit/plates";
import { SWAP } from "./tree-constants.js";
import { GONE, insertAt, nodeAt, pathOfLeaf, prune, replaceAt } from "./tree-nodes.js";

const ROW_EDGE_SHARE = 0.28;

const ROW_EDGE_CEILING_PX = 64;

export function targetAt(spots, x, y) {
	const pointer = { x, y };
	const over = spots
		.filter((spot) => isOver(spot, pointer))
		.sort((one, other) => other.path.length - one.path.length)[0];
	if (!over) return null;
	if (over.dir === SWAP) return targetInSwap(spots, over, pointer);
	if (over.kind === "box") return { kind: "beside", box: over.path, at: slotIn(spots, over, pointer) };
	return besideOrWrap(spots, over, pointer);
}

export function sameTarget(one, other) {
	if (!one || !other) return one === other;
	if (one.kind !== other.kind) return false;
	if (one.kind === "wrap") return samePath(one.path, other.path) && one.axis === other.axis && one.side === other.side;
	return samePath(one.box, other.box) && one.at === other.at;
}

const NOTHING_AT_PATH = "Widgetarium: no box stands at {path}, so the tile was left where it was.";

export function moveInto(root, id, target) {
	const from = pathOfLeaf(root, id);
	if (from === null || !target) return root;
	const held = nodeAt(root, from);
	const blanked = replaceAt(root, from, GONE);
	if (target.kind === "wrap") {
		const wrapped = nodeAt(blanked, target.path);
		if (!wrapped || wrapped.gone) return root;
		return prune(replaceAt(blanked, target.path, wrapping(wrapped, held, target)));
	}
	const grown = insertAt(blanked, target.box, target.at, held);
	if (grown === null) {
		console.warn(NOTHING_AT_PATH.replace("{path}", target.box.join("/")));
		return root;
	}
	return prune(grown);
}

const samePath = (one, other) => one.length === other.length && one.every((step, at) => step === other[at]);

const isWithin = (path, of) => path.length > of.length && samePath(path.slice(0, of.length), of);

function edgeOf(box, pointer) {
	const acrossEdge = Math.min((box.right - box.left) * ROW_EDGE_SHARE, ROW_EDGE_CEILING_PX);
	const downEdge = Math.min((box.bottom - box.top) * ROW_EDGE_SHARE, ROW_EDGE_CEILING_PX);
	if (pointer.y < box.top + downEdge) return { axis: COLUMN, side: "before" };
	if (pointer.y > box.bottom - downEdge) return { axis: COLUMN, side: "after" };
	if (pointer.x < box.left + acrossEdge) return { axis: ROW, side: "before" };
	if (pointer.x > box.right - acrossEdge) return { axis: ROW, side: "after" };
	return null;
}

const isPastMiddle = (box, dir, pointer) =>
	dir === COLUMN ? pointer.y > (box.top + box.bottom) / 2 : pointer.x > (box.left + box.right) / 2;

function halfOf(box, dir, pointer) {
	return { axis: dir, side: isPastMiddle(box, dir, pointer) ? "after" : "before" };
}

function slotIn(spots, box, pointer) {
	return childrenOf(spots, box).filter((spot) => isPastMiddle(spot.box, box.dir, pointer)).length;
}

const isOver = (spot, pointer) =>
	pointer.x >= spot.box.left &&
	pointer.x <= spot.box.right &&
	pointer.y >= spot.box.top &&
	pointer.y <= spot.box.bottom;

function besideOrWrap(spots, over, pointer) {
	const parent = over.path.slice(0, -1);
	const dir = spots.find((spot) => samePath(spot.path, parent))?.dir ?? COLUMN;
	const aimed = edgeOf(over.box, pointer) ?? halfOf(over.box, dir, pointer);
	if (aimed.axis !== dir) return { kind: "wrap", path: over.path, axis: aimed.axis, side: aimed.side };
	const at = over.path[over.path.length - 1];
	return { kind: "beside", box: parent, at: aimed.side === "after" ? at + 1 : at };
}

const childrenOf = (spots, box) =>
	spots.filter((spot) => spot.path.length === box.path.length + 1 && isWithin(spot.path, box.path));

// TRADE-OFF: a swap box takes no sibling, because a child of it is a NAMED view and a drop names nothing — so the aim falls through to the view on screen, where it can only wrap
function targetInSwap(spots, over, pointer) {
	const shown = childrenOf(spots, over)[0];
	return shown ? besideOrWrap(spots, shown, pointer) : null;
}

// TRADE-OFF: ratio, name and hidden are facts about the child's PLACE in its parent, so they stay on the wrapper; leaving the name inside would take a view's name off the box that swaps it
function wrapping(node, held, { axis, side }) {
	const { ratio, name, hidden, ...inner } = node;
	return {
		dir: axis,
		...(ratio === undefined ? {} : { ratio }),
		...(name === undefined ? {} : { name }),
		...(hidden === undefined ? {} : { hidden }),
		of: side === "before" ? [held, inner] : [inner, held],
	};
}
