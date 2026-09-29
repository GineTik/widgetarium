import { GRID, spanToPixels } from "./paths.js";
import { APART, COLUMN, GROUP, isPainted, NO_SURFACE, ROW, SURFACES } from "@widgetarium/kit/plates";
import { DRAWER_MAX_PX, HIDE, REGION_PAD_PX, SURFACE_PAD_PX, SWAP, TEXT_ROLE } from "./tree-constants.js";
import { isBox, leavesOf, pathKey, slotOf } from "./tree-nodes.js";
import { innerWidthOf, insetOf, pairGapOf, plateOf, stepOf, UNDRAWN_SPACE } from "./tree-spacing.js";
import { floorOf, growsOf, limitsOf, preferredSizeAt, widthsOf } from "./tree-sizes.js";
import {
	collapseOf,
	isAlwaysToggled,
	isCollapsible,
	isFoldedAway,
	leavesNarrowRow,
	openKeyOf,
	overlayWidthOf,
	regionSurfaceOf,
	sideAt,
} from "./tree-collapse.js";

export {
	APART,
	COLUMN,
	GROUP,
	isPainted,
	NO_SURFACE,
	ROW,
	SIDES,
	SURFACES,
	SURFACE_WAS,
} from "@widgetarium/kit/plates";
export {
	ADAPTIVE,
	ALWAYS,
	COLLAPSES,
	CORNER_STEP_PX,
	DRAWER,
	DRAWER_MAX_PX,
	GAP_PX,
	HIDE,
	MAIN_FLOOR_PX,
	MENU,
	MENU_PX,
	MIN_CORNER_PX,
	MIN_GAP_PX,
	MIN_HEIGHT_PX,
	MIN_SIDEBAR_PX,
	PLATE_CORNER_PX,
	REGION_GAP_PX,
	REGION_PAD_PX,
	SHEET,
	SIDEBAR_PX,
	STACK,
	STEP_PX,
	SURFACE_PAD_PX,
	SWAP,
	TEXT_ROLE,
	TOGGLES,
} from "./tree-constants.js";
export {
	byPath,
	holdsOf,
	insertAt,
	isBox,
	leavesOf,
	nodeAt,
	pathKey,
	pathOfLeaf,
	prune,
	replaceAt,
	shownIn,
	swapBoxes,
	withHolds,
	withWidth,
	withoutLeaf,
} from "./tree-nodes.js";
export {
	UNDRAWN_SPACE,
	cardsGapOf,
	cornerOf,
	facingOf,
	gapVarsOf,
	gapsOf,
	innerWidthOf,
	insetOf,
	levelAt,
	pairGapOf,
	plateOf,
	seenGapOf,
	stepOf,
} from "./tree-spacing.js";
export {
	columnsOf,
	drawerWidth,
	isFolded,
	keptAt,
	sideOf,
	sidebarWidth,
	toggleFold,
	toggleFoldAt,
	widenBox,
} from "./tree-columns.js";
export {
	collapseOf,
	isAlwaysToggled,
	isDividedByDefault,
	openKeyOf,
	overlayWidthOf,
	regionCollapseOf,
	regionSurfaceOf,
	togglesUnder,
} from "./tree-collapse.js";
export { moveInto, sameTarget, targetAt } from "./tree-drop.js";
export { floorOf, growsOf, preferredSizeAt, widthsOf } from "./tree-sizes.js";

const HAIR_PX = 0.5;

export function layRegion(root, at, given, { ask, isFloating = false, viewportPx = given }) {
	const worn = isFloating ? { surface: NO_SURFACE, side: null } : regionSurfaceOf(root, at);
	const pad = isPainted(worn) ? SURFACE_PAD_PX : REGION_PAD_PX;
	const plates = isPainted(worn) ? 1 : 0;
	const node = layNode(withoutSurface(root.of[at]), given - pad * 2, {
		ask,
		path: [at],
		edges: allEdges(pad),
		plates,
		underSurface: isPainted(worn) ? worn.surface : NO_SURFACE,
		regionRole: root.of[at]?.role ?? null,
		regionPx: given,
		level: 0,
		viewportPx,
	});
	return { worn, plate: plates ? plateOf(1) : null, node };
}

export function withoutSurface(node) {
	const { surface, side, ...bare } = node;
	return surface === undefined && side === undefined ? node : bare;
}

export const allEdges = (px) => ({ top: px, bottom: px, left: px, right: px });

export function edgesOfChild(box, edges, at, dir = box.dir, space = UNDRAWN_SPACE) {
	const base = isPainted(box) ? allEdges(SURFACE_PAD_PX) : edges;
	if (dir === SWAP) return { ...base, top: box.strip === false ? base.top : null };
	const ends = { isFirst: at === 0, isLast: at === box.of.length - 1 };
	return dir === ROW ? edgesInRow(base, ends) : edgesInColumn(base, ends);
}

export const REGIONS_THAT_PLATE = ["indicators"];
const ROLES_LEFT_BARE = [TEXT_ROLE, "layout", "control", "navigation"];

export function wearInRegion(leaf, how) {
	if (leaf.surface !== undefined) return leaf;
	if (!REGIONS_THAT_PLATE.includes(how.regionRole)) return leaf;
	if (how.underSurface !== NO_SURFACE) return leaf;
	if (ROLES_LEFT_BARE.includes(how.ask(leaf.id).role)) return leaf;
	return { ...leaf, surface: GROUP };
}

export function layNode(node, width, how) {
	const held = { path: [], edges: allEdges(0), plates: 0, underSurface: NO_SURFACE, level: 0, ...how };
	if (!isBox(node)) return layLeaf(wearInRegion(node, held), width, held);
	const inner = width - 2 * insetOf(node);
	if (node.dir === SWAP) return laySwap(node, width, inner, held);
	if (node.dir === COLUMN) return layColumn(node, width, inner, held);
	const standing = { ...node, of: node.of.filter((child) => !isFoldedAway(child)) };
	const sized = sharedWidths(standing, inner, spaceOf(held));
	if (!mustStack(standing, sized, held.ask)) {
		if (standing.of.length === node.of.length) return layRow(node, width, held, sized);
		return layRowWithout(node, width, held, { sized, leaves: isFoldedAway });
	}
	if (isCollapsible(node) && held.path.length > 1 && held.opened !== pathKey(held.path))
		return collapseNode(node, held, "left");
	const kept = { ...node, of: node.of.filter((child) => !leavesNarrowRow(child)) };
	const keptSized = sharedWidths(kept, inner, spaceOf(held));
	const isCollapsing = kept.of.length !== node.of.length;
	if (!isCollapsing || mustStack(kept, keptSized, held.ask)) {
		return {
			...layColumn(node, width, inner, { ...held, childAcross: 1 }, isCollapsing),
			isStacked: true,
			hasCollapsed: isCollapsing,
		};
	}
	return layRowWithout(node, width, held, { sized: keptSized, leaves: leavesNarrowRow });
}

function layLeaf(node, width, how) {
	const isPlate = isPainted(node);
	return {
		kind: "leaf",
		id: node.id,
		path: how.path,
		level: how.level,
		plates: how.plates + (isPlate ? 1 : 0),
		underSurface: isPlate ? node.surface : how.underSurface,
		width,
		grow: 1,
		ratio: node.ratio ?? 1,
		across: how.across ?? null,
		...surfaceFields(node),
		...plateFields(node, how),
		...limitsOf(how.ask(node.id)),
		...preferredSizeAt(how.ask(node.id).preferred, how.regionPx),
	};
}

function sharedWidths(box, width, space) {
	const fixed = box.of.map((child) => (child.width > 0 ? child.width : 0));
	const free = box.of.filter((child, at) => fixed[at] === 0);
	const inner = innerWidthOf(box, width, space) - fixed.reduce((sum, one) => sum + one, 0);
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

function edgesInRow(base, { isFirst, isLast }) {
	return { top: base.top, bottom: base.bottom, left: isFirst ? base.left : null, right: isLast ? base.right : null };
}

function edgesInColumn(base, { isFirst, isLast }) {
	return { left: base.left, right: base.right, top: isFirst ? base.top : null, bottom: isLast ? base.bottom : null };
}

function dividerOf(child, edges, box, { at, dir, space }) {
	if (child.surface !== APART) return {};
	const [before, after] = dir === ROW ? [edges.top, edges.bottom] : [edges.left, edges.right];
	const side = child.side ?? "end";
	const beside = pairGapOf(box, side === "end" ? at : at - 1, space, dir);
	return {
		side,
		dividerAxis: dir === ROW ? ROW : COLUMN,
		dividerBefore: before,
		dividerAfter: after,
		dividerHalf: beside / 2,
	};
}

const spaceOf = (how) => ({ level: how.level, ask: how.ask });

function placeChild(box, how, at, dir) {
	const space = spaceOf(how);
	const edges = edgesOfChild(box, how.edges, at, dir, space);
	const isPlate = isPainted(box);
	const plates = how.plates + (isPlate ? 1 : 0);
	const underSurface = isPlate ? box.surface : how.underSurface;
	const level = box.dir === SWAP ? how.level : how.level + 1;
	return {
		how: {
			...how,
			path: [...how.path, at],
			edges,
			plates,
			underSurface,
			level,
			across: how.childAcross ?? null,
			childAcross: null,
		},
		divider: {
			...dividerOf(box.of[at], edges, box, { at, dir, space }),
			gapAfter: at === box.of.length - 1 ? 0 : pairGapOf(box, at, space, dir),
		},
	};
}

const surfaceFields = (node) =>
	node.surface ? { surface: node.surface, ...(node.side ? { side: node.side } : {}) } : {};

const plateFields = (node, how) => (isPainted(node) ? plateOf(how.plates + 1) : {});

function toggleFields(node, path) {
	if (!isAlwaysToggled(node)) return {};
	return {
		isAlwaysToggled: true,
		openKey: openKeyOf(node, path),
		label: node.name ?? node.purpose ?? null,
		hasTrigger: typeof node.trigger === "string",
	};
}

function boxShape(node, dir, width, how) {
	return {
		kind: "box",
		dir,
		path: how.path,
		width,
		gap: stepOf(how.level),
		...(node.measure > 0 ? { measure: node.measure } : {}),
		...surfaceFields(node),
		...plateFields(node, how),
		...toggleFields(node, how.path),
	};
}

function mustStack(node, sized, ask) {
	return node.of.some((child, at) => sized[at].width + HAIR_PX < floorOf(child, ask) + 2 * insetOf(child));
}

function layRow(node, width, how, sized) {
	return {
		...boxShape(node, ROW, width, how),
		isStacked: false,
		of: node.of.map((child, at) => {
			const placed = placeChild(node, how, at, ROW);
			return { ...layNode(child, sized[at].width, placed.how), ...sized[at], ...placed.divider };
		}),
	};
}

function collapseNode(node, how, side) {
	const into = collapseOf(node);
	const width = overlayWidthOf(into, how.viewportPx ?? DRAWER_MAX_PX) - 2 * REGION_PAD_PX;
	const opened = {
		...how,
		edges: allEdges(REGION_PAD_PX),
		plates: 0,
		underSurface: NO_SURFACE,
		level: 0,
		opened: pathKey(how.path),
	};
	return {
		kind: "collapsed",
		path: how.path,
		into,
		side,
		openKey: openKeyOf(node, how.path),
		hasTrigger: typeof node.trigger === "string",
		name: node.name ?? node.purpose ?? null,
		isFolded: false,
		node: layNode(node, width, opened),
	};
}

function foldNode(node, how, side) {
	return { ...collapseNode(node, how, side), into: HIDE, isFolded: true };
}

const awayNode = (node, how, side) => (isFoldedAway(node) ? foldNode(node, how, side) : collapseNode(node, how, side));

// TRADE-OFF: the row keeps its collapsed children in place as zero-width entries, so every path stays the note's; its ratio grips are not drawn while any child is collapsed
function layRowWithout(node, width, how, { sized, leaves }) {
	let taken = 0;
	return {
		...boxShape(node, ROW, width, how),
		isStacked: false,
		hasCollapsed: true,
		of: node.of.map((child, at) => {
			const placed = placeChild(node, { ...how, childAcross: sized.length }, at, ROW);
			if (leaves(child)) return awayNode(child, placed.how, sideAt(node, at));
			const size = sized[taken];
			taken += 1;
			return { ...layNode(child, size.width, placed.how), ...size, ...placed.divider };
		}),
	};
}

// TRADE-OFF: a child of a column declares `basis: "auto"` so its own height survives; flex-basis 0 would replace the height with the content's, which is what silently ate every height a column held
function layColumn(node, width, inner, how, isCollapsing = false) {
	return {
		...boxShape(node, COLUMN, width, how),
		isStacked: false,
		of: node.of.map((child, at) => {
			const placed = placeChild(node, how, at, COLUMN);
			if (isFoldedAway(child)) return foldNode(child, placed.how, sideAt(node, at));
			if (isCollapsing && isCollapsible(child)) return collapseNode(child, placed.how, sideAt(node, at));
			return { ...layNode(child, inner, placed.how), ...placed.divider, grow: 0, basis: "auto" };
		}),
	};
}

// TRADE-OFF: every child is laid out, the hidden ones included, because a view that is not on screen keeps its widgets mounted and its refs alive — which is the whole reason this box exists
function laySwap(node, width, inner, how) {
	return {
		...boxShape(node, SWAP, width, how),
		isStacked: false,
		id: node.id,
		strip: node.strip !== false,
		of: node.of.map((child, at) => {
			const placed = placeChild(node, how, at, SWAP);
			return { ...layNode(child, inner, placed.how), ...placed.divider, ...slotOf(child), grow: 0, basis: "auto" };
		}),
	};
}
