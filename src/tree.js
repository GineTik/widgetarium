import { heldBetween } from "./give.js";
import { GRID, spanToPixels } from "./paths.js";

export const GAP_PX = 8;
export const LADDER = 12;
export const MIN_HEIGHT_PX = 42;
const HAIR_PX = 0.5;
export const SIDEBAR_PX = 280;
export const REGION_PAD_PX = 8;
export const REGION_GAP_PX = 32;
export const MAIN_FLOOR_PX = 480;
export const MIN_SIDEBAR_PX = 200;
export const ROW = "row";
export const COLUMN = "column";

export function isBox(node) {
	return Array.isArray(node?.of);
}

function isLeaf(node) {
	return typeof node?.id === "string" && node.id !== "";
}

const DECLARED_KEYS = ["keep", "foldable", "folded", "width", "scroll", "name"];

function isDeclared(node) {
	return DECLARED_KEYS.some((key) => node?.[key] !== undefined);
}

export function nodeAt(root, path) {
	let node = root;
	for (const step of path) {
		if (!isBox(node)) return null;
		node = node.of[step];
	}
	return node ?? null;
}

export function leavesOf(root, path = []) {
	if (isLeaf(root)) return [{ id: root.id, path }];
	if (!isBox(root)) return [];
	return root.of.flatMap((child, at) => leavesOf(child, [...path, at]));
}

export function pathOfLeaf(root, id) {
	return leavesOf(root).find((leaf) => leaf.id === id)?.path ?? null;
}

export function replacedAt(root, path, node) {
	if (path.length === 0) return node;
	const [step, ...rest] = path;
	if (!isBox(root) || !root.of[step]) return root;
	return { ...root, of: root.of.map((child, at) => (at === step ? replacedAt(child, rest, node) : child)) };
}

// TRADE-OFF: a path that names no box answers null rather than the tree it was given — a caller that mistook the refusal for a result once handed back a tree whose carried tile had already been taken out of it
export function insertedAt(root, path, at, node) {
	const box = nodeAt(root, path);
	if (!isBox(box)) return null;
	const held = Math.min(Math.max(at, 0), box.of.length);
	return replacedAt(root, path, { ...box, of: [...box.of.slice(0, held), node, ...box.of.slice(held)] });
}

const GONE = { gone: true };

function collapsedInto(box, child) {
	const held = { ...child, ratio: box.ratio ?? child.ratio ?? 1 };
	return box.height !== undefined && child.height === undefined ? { ...held, height: box.height } : held;
}

function isSurviving(node) {
	if (node?.gone) return false;
	if (!isBox(node)) return isLeaf(node);
	return node.of.length > 0 || isDeclared(node);
}

export function pruned(node, isRoot = true) {
	if (!isBox(node)) return node;
	const of = node.of.map((child) => pruned(child, false)).filter(isSurviving);
	const settled = { ...node, of };
	if (isRoot || of.length !== 1 || isDeclared(node)) return settled;
	return collapsedInto(settled, of[0]);
}

export function withoutLeaf(root, id) {
	const path = pathOfLeaf(root, id);
	return path === null ? root : pruned(replacedAt(root, path, GONE));
}

export function withRatios(root, path, ratios) {
	const box = nodeAt(root, path);
	if (!isBox(box)) return root;
	return replacedAt(root, path, {
		...box,
		of: box.of.map((child, at) => (ratios[at] === undefined ? child : { ...child, ratio: ratios[at] })),
	});
}

export function withHeight(root, path, height) {
	const node = nodeAt(root, path);
	return node ? replacedAt(root, path, { ...node, height }) : root;
}

export function withWidth(root, path, width) {
	const node = nodeAt(root, path);
	return node ? replacedAt(root, path, { ...node, width }) : root;
}

export function floorOf(node, ask) {
	return widest(declaredPx(node, ask, "minPx"));
}

export function heldHeight(node, { wantedPx, ask, give }) {
	const floor = Math.max(shortestOf(node, ask), MIN_HEIGHT_PX);
	const ceiling = tallestOf(node, ask) || Infinity;
	return Math.round(heldBetween(wantedPx, floor, Math.max(floor, ceiling), give));
}

export function heightOf(node, gap = GAP_PX) {
	if (node?.height) return node.height;
	if (!isBox(node)) return 0;
	const heights = node.of.map((child) => heightOf(child, gap));
	if (node.dir !== COLUMN) return widest(heights);
	return heights.some((one) => one === 0) ? 0 : heights.reduce((sum, one) => sum + one + gap, -gap);
}

export function innerOf(cells, width, gap = GAP_PX) {
	return width - gap * (cells - 1);
}

export function pixelHeight(rowSpan) {
	return spanToPixels(Math.max(rowSpan, 1), GRID.cellPx, GRID.gapPx);
}

export function widthsOf(row, inner) {
	const total = row.reduce((sum, cell) => sum + (cell.ratio ?? 1), 0);
	return row.map((cell) => (inner * (cell.ratio ?? 1)) / total);
}

export function growsOf(row) {
	return widthsOf(row, 1);
}

function sharedWidths(box, width, gap) {
	const fixed = box.of.map((child) => (child.width > 0 ? child.width : 0));
	const free = box.of.filter((child, at) => fixed[at] === 0);
	const inner = innerOf(box.of.length, width, gap) - fixed.reduce((sum, one) => sum + one, 0);
	const shares = widthsOf(free, Math.max(inner, 0));
	const grows = growsOf(free);
	let taken = 0;
	return box.of.map((child, at) => {
		if (fixed[at] > 0) return { width: fixed[at], basisPx: fixed[at], grow: 0 };
		const held = { width: shares[taken], grow: grows[taken] };
		taken += 1;
		return held;
	});
}

const deeper = (how, at) => ({ ...how, path: [...how.path, at] });

function mustStack(node, sized, ask) {
	return node.of.some((child, at) => sized[at].width + HAIR_PX < floorOf(child, ask));
}

function laidRow(node, width, how, sized) {
	return {
		kind: "box",
		dir: ROW,
		path: how.path,
		width,
		height: heightOf(node, how.gap) || null,
		isStacked: false,
		of: node.of.map((child, at) => ({ ...laid(child, sized[at].width, deeper(how, at)), ...sized[at] })),
	};
}

export function laid(node, width, how) {
	const held = { gap: GAP_PX, path: [], ...how };
	if (!isBox(node)) return laidLeaf(node, width, held);
	if (node.dir === COLUMN) return laidColumn(node, width, held);
	const sized = sharedWidths(node, width, held.gap);
	if (mustStack(node, sized, held.ask)) return { ...laidColumn(node, width, held), isStacked: true };
	return laidRow(node, width, held, sized);
}

// TRADE-OFF: a child of a column declares `basis: "auto"` so its own height survives; flex-basis 0 would replace the height with the content's, which is what silently ate every height a column held
function laidColumn(node, width, how) {
	return {
		kind: "box",
		dir: COLUMN,
		path: how.path,
		width,
		height: node.height ?? null,
		isStacked: false,
		of: node.of.map((child, at) => ({ ...laid(child, width, deeper(how, at)), grow: 0, basis: "auto" })),
	};
}

const limitsOf = (declared) => ({ minPx: declared.minPx ?? 0, cap: declared.cap ?? 0 });

function laidLeaf(node, width, how) {
	return {
		kind: "leaf",
		id: node.id,
		path: how.path,
		width,
		grow: 1,
		ratio: node.ratio ?? 1,
		height: node.height ?? null,
		...limitsOf(how.ask(node.id)),
	};
}

export function resized(row, at, { boundaryPx, inner, isFree, give }) {
	const total = row.reduce((sum, cell) => sum + cell.ratio, 0);
	const widths = widthsOf(row, inner);
	const before = widths.slice(0, at).reduce((sum, one) => sum + one, 0);
	const pair = widths[at] + widths[at + 1];
	const low = row[at].minPx ?? 0;
	const high = Math.max(low, pair - (row[at + 1].minPx ?? 0));
	const wanted = boundaryPx - before;
	const asked = isFree ? wanted : snapped(wanted, inner);
	const held = Math.min(Math.max(heldBetween(asked, low, high, give), 0), pair);
	return row.map((cell, index) => {
		if (index === at) return { ...cell, ratio: (held * total) / inner };
		if (index === at + 1) return { ...cell, ratio: ((pair - held) * total) / inner };
		return cell;
	});
}

const ROW_EDGE_SHARE = 0.28;
const ROW_EDGE_CEILING_PX = 64;

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
	const children = spots.filter((spot) => spot.path.length === box.path.length + 1 && isWithin(spot.path, box.path));
	return children.filter((spot) => isPastMiddle(spot.box, box.dir, pointer)).length;
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

export function aimedAt(spots, x, y) {
	const pointer = { x, y };
	const over = spots
		.filter((spot) => isOver(spot, pointer))
		.sort((one, other) => other.path.length - one.path.length)[0];
	if (!over) return null;
	if (over.kind === "box") return { kind: "beside", box: over.path, at: slotIn(spots, over, pointer) };
	return besideOrWrap(spots, over, pointer);
}

export function sameTarget(one, other) {
	if (!one || !other) return one === other;
	if (one.kind !== other.kind) return false;
	if (one.kind === "wrap") return samePath(one.path, other.path) && one.axis === other.axis && one.side === other.side;
	return samePath(one.box, other.box) && one.at === other.at;
}

function wrapping(node, held, { axis, side }) {
	const { ratio, ...inner } = node;
	return {
		dir: axis,
		...(ratio === undefined ? {} : { ratio }),
		of: side === "before" ? [held, inner] : [inner, held],
	};
}

const NOTHING_AT_PATH = "Widgetarium: no box stands at {path}, so the tile was left where it was.";

export function movedInto(root, id, target) {
	const from = pathOfLeaf(root, id);
	if (from === null || !target) return root;
	const held = nodeAt(root, from);
	const blanked = replacedAt(root, from, GONE);
	if (target.kind === "wrap") {
		const wrapped = nodeAt(blanked, target.path);
		if (!wrapped || wrapped.gone) return root;
		return pruned(replacedAt(blanked, target.path, wrapping(wrapped, held, target)));
	}
	const grown = insertedAt(blanked, target.box, target.at, held);
	if (grown === null) {
		console.warn(NOTHING_AT_PATH.replace("{path}", target.box.join("/")));
		return root;
	}
	return pruned(grown);
}

export function keptAt(root) {
	return root.of.findIndex((child) => child.keep === true);
}

export function foldableIn(root) {
	return root.of.map((child, at) => (child.foldable === true ? at : null)).filter((at) => at !== null);
}

export function isFolded(root, at) {
	return Boolean(root.of[at]?.folded);
}

export function toggledFold(root, at) {
	return replacedAt(root, [at], { ...root.of[at], folded: !isFolded(root, at) });
}

export function sidebarWidth(root, at) {
	return root.of[at]?.width ?? SIDEBAR_PX;
}

export function sideOf(root, at) {
	const keep = keptAt(root);
	return keep >= 0 && at > keep ? "right" : "left";
}

const DRAWER_SHARE = 0.82;
export const DRAWER_MAX_PX = 420;

export function drawerWidth(viewportPx) {
	return Math.round(Math.min(viewportPx * DRAWER_SHARE, DRAWER_MAX_PX));
}

function besideWidths({ root, all, kept, keep, room }) {
	return all
		.filter((at) => at === keep || kept.includes(at))
		.map((at) => ({ at, width: at === keep ? room : sidebarWidth(root, at) }));
}

const roomLeftBy = (root, held, width, gap) =>
	width - held.reduce((sum, at) => sum + gap + sidebarWidth(root, at), 0);

// TRADE-OFF: the box farthest from the one that must stand is dropped first, because a person reads the far edge as the least attached to what they are looking at
function standingBeside({ root, open, keep, width, gap }) {
	const farthestFirst = [...open].sort((one, other) => Math.abs(other - keep) - Math.abs(one - keep) || other - one);
	const tries = farthestFirst.map((at, index) => farthestFirst.slice(index + 1));
	return [open, ...tries].find((held) => roomLeftBy(root, held, width, gap) >= MAIN_FLOOR_PX) ?? [];
}

// TRADE-OFF: a drawer is offered only for the root's own children, because a box nested inside another has no window-wide layer to cover; a nested box out of width stacks instead
export function columnsOf(root, width, gap = REGION_GAP_PX) {
	const all = root.of.map((child, at) => at);
	const keep = keptAt(root);
	if (keep < 0) return { beside: [], floating: [], hidden: [], alone: all };
	const open = all.filter((at) => at !== keep && !isFolded(root, at));
	const kept = standingBeside({ root, open, keep, width, gap });
	const rest = all.filter((at) => at !== keep && !kept.includes(at));
	const cannotStand = (at) => roomLeftBy(root, [...kept, at], width, gap) < MAIN_FLOOR_PX;
	return {
		beside: besideWidths({ root, all, kept, keep, room: roomLeftBy(root, kept, width, gap) }),
		floating: rest.filter(cannotStand),
		hidden: rest.filter((at) => !cannotStand(at)),
		alone: [],
	};
}

export function widenedBox(root, at, { wantedPx, width, gap = REGION_GAP_PX, give }) {
	const keep = keptAt(root);
	const other = root.of
		.map((child, index) => index)
		.filter((index) => index !== keep && index !== at && !isFolded(root, index));
	const ceiling = roomLeftBy(root, other, width, gap) - gap - MAIN_FLOOR_PX;
	return Math.round(heldBetween(wantedPx, MIN_SIDEBAR_PX, ceiling, give));
}

function snapped(px, inner) {
	const step = inner / LADDER;
	return Math.round(px / step) * step;
}

const widest = (all) => all.reduce((most, one) => Math.max(most, one), 0);
const declaredPx = (node, ask, field) => leavesOf(node).map((leaf) => ask(leaf.id)[field] ?? 0);
const shortestOf = (node, ask) => widest(declaredPx(node, ask, "shortestPx"));

function tallestOf(node, ask) {
	const ceilings = declaredPx(node, ask, "tallestPx");
	return ceilings.some((one) => one === 0) ? 0 : widest(ceilings);
}
