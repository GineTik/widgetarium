import { APART, COLUMN, GROUP, isPainted, NO_SURFACE, ROW } from "@widgetarium/kit/plates";
import { DRAWER_MAX_PX, HIDE, REGION_PAD_PX, SURFACE_PAD_PX, SWAP, TEXT_ROLE } from "./tree-constants.js";
import { isBox, pathKey, slotOf } from "./tree-nodes.js";
import type { AskLeaf, BoardNode, BoxDirection, BoxNode, LeafNode, NodePath, PlaceFlags } from "./tree-nodes.js";
import { innerWidthOf, insetOf, pairGapOf, plateOf, stepOf } from "./tree-spacing.js";
import type { Plate, Space } from "./tree-spacing.js";
import { floorOf, growsOf, limitsOf, preferredSizeAt, widthsOf } from "./tree-sizes.js";
import type { ScreenSide } from "./tree-columns.js";
import type { RegionSurface } from "./tree-collapse.js";
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
import { allEdges, edgesOfChild } from "./tree-edges.js";
import type {
	Divider,
	Edges,
	LaidBox,
	LaidChild,
	LaidCollapsed,
	LaidLeaf,
	LaidNode,
	LaidRegion,
	LayAsk,
	LayPlace,
	RegionAsk,
	SizedCell,
	SurfaceFields,
} from "./tree-laid.js";

export type {
	Edges,
	LaidBox,
	LaidChild,
	LaidCollapsed,
	LaidLeaf,
	LaidNode,
	LaidRegion,
	LayAsk,
	Placement,
	RegionAsk,
	SizedCell,
} from "./tree-laid.js";
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
export * from "./tree-constants.js";
export * from "./tree-nodes.js";
export * from "./tree-spacing.js";
export * from "./tree-columns.js";
export { allEdges, edgesOfChild } from "./tree-edges.js";
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

const NO_REGION_AT = "Widgetarium: no region stands at {at}.";

export function layRegion(
	root: BoxNode,
	at: number,
	given: number,
	{ ask, isFloating = false, viewportPx = given }: RegionAsk,
): LaidRegion {
	const region = root.of[at];
	if (region === undefined) throw new Error(NO_REGION_AT.replace("{at}", String(at)));
	const worn: RegionSurface = isFloating ? { surface: NO_SURFACE, side: null } : regionSurfaceOf(root, at);
	const pad = isPainted(worn) ? SURFACE_PAD_PX : REGION_PAD_PX;
	const plates = isPainted(worn) ? 1 : 0;
	const node = layNode(withoutSurface(region), given - pad * 2, {
		ask,
		path: [at],
		edges: allEdges(pad),
		plates,
		underSurface: isPainted(worn) ? worn.surface : NO_SURFACE,
		regionRole: isBox(region) ? (region.role ?? null) : null,
		regionPx: given,
		level: 0,
		viewportPx,
	});
	return { worn, plate: plates ? plateOf(1) : null, node };
}

export function withoutSurface(node: BoardNode): BoardNode {
	const { surface, side, ...bare } = node;
	return surface === undefined && side === undefined ? node : bare;
}

const REGIONS_THAT_PLATE: readonly string[] = ["indicators"];
const ROLES_LEFT_BARE: readonly string[] = [TEXT_ROLE, "layout", "control", "navigation"];

export function layNode(node: BoardNode, width: number, how: LayAsk): LaidNode {
	const held: LayPlace = { path: [], edges: allEdges(0), plates: 0, underSurface: NO_SURFACE, level: 0, ...how };
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

function layLeaf(node: LeafNode, width: number, how: LayPlace): LaidLeaf {
	const isPlate = isPainted(node);
	return {
		kind: "leaf",
		id: node.id,
		path: how.path,
		level: how.level,
		plates: how.plates + (isPlate ? 1 : 0),
		underSurface: isPlate ? GROUP : how.underSurface,
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

const fixedWidthOf = (child: BoardNode): number =>
	isBox(child) && child.width !== undefined && child.width > 0 ? child.width : 0;

function sharedWidths(box: BoxNode, width: number, space: Space): SizedCell[] {
	const fixed = box.of.map(fixedWidthOf);
	const free = box.of.filter((_child, at) => fixed[at] === 0);
	const inner = innerWidthOf(box, width, space) - fixed.reduce((sum, one) => sum + one, 0);
	const shares = widthsOf(free, Math.max(inner, 0));
	const grows = growsOf(free);
	let taken = 0;
	return fixed.map((fixedPx) => {
		if (fixedPx > 0) return { width: fixedPx, basisPx: fixedPx, grow: 0 };
		const held = { width: shares[taken] ?? 0, grow: grows[taken] ?? 0 };
		taken += 1;
		return held;
	});
}

interface DividerAsk {
	readonly at: number;
	readonly dir: BoxDirection;
	readonly space: Space;
}

function dividerOf(
	child: BoardNode | undefined,
	edges: Edges,
	box: BoxNode,
	{ at, dir, space }: DividerAsk,
): Omit<Divider, "gapAfter"> {
	if (child?.surface !== APART) return {};
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

const spaceOf = (how: LayPlace): Space => ({ level: how.level, ask: how.ask });

interface PlacedChild {
	readonly how: LayPlace;
	readonly divider: Divider;
}

function placeChild(box: BoxNode, how: LayPlace, at: number, dir: BoxDirection): PlacedChild {
	const space = spaceOf(how);
	const edges = edgesOfChild(box, how.edges, at, dir);
	const isPlate = isPainted(box);
	const plates = how.plates + (isPlate ? 1 : 0);
	const underSurface = isPlate ? GROUP : how.underSurface;
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

const surfaceFields = (node: PlaceFlags): SurfaceFields =>
	node.surface ? { surface: node.surface, ...(node.side ? { side: node.side } : {}) } : {};

const plateFields = (node: PlaceFlags, how: LayPlace): Partial<Plate> =>
	isPainted(node) ? plateOf(how.plates + 1) : {};

type ToggleFields = Pick<LaidBox, "isAlwaysToggled" | "openKey" | "label" | "hasTrigger">;

type BoxShape = Omit<LaidBox, "of" | "isStacked">;

function toggleFields(node: BoxNode, path: NodePath): ToggleFields {
	if (!isAlwaysToggled(node)) return {};
	return {
		isAlwaysToggled: true,
		openKey: openKeyOf(node, path),
		label: node.name ?? node.purpose ?? null,
		hasTrigger: typeof node.trigger === "string",
	};
}

function boxShape(node: BoxNode, dir: BoxDirection, width: number, how: LayPlace): BoxShape {
	return {
		kind: "box",
		dir,
		path: how.path,
		width,
		gap: stepOf(how.level),
		...(node.measure !== undefined && node.measure > 0 ? { measure: node.measure } : {}),
		...surfaceFields(node),
		...plateFields(node, how),
		...toggleFields(node, how.path),
	};
}

const UNSIZED: SizedCell = { width: 0, grow: 0 };

function mustStack(node: BoxNode, sized: readonly SizedCell[], ask: AskLeaf): boolean {
	return node.of.some((child, at) => (sized[at] ?? UNSIZED).width + HAIR_PX < floorOf(child, ask) + 2 * insetOf(child));
}

function layRow(node: BoxNode, width: number, how: LayPlace, sized: readonly SizedCell[]): LaidBox {
	return {
		...boxShape(node, ROW, width, how),
		isStacked: false,
		of: node.of.map((child, at) => {
			const placed = placeChild(node, how, at, ROW);
			const size = sized[at] ?? UNSIZED;
			return { ...layNode(child, size.width, placed.how), ...size, ...placed.divider };
		}),
	};
}

function collapseNode(node: BoxNode, how: LayPlace, side: ScreenSide): LaidCollapsed {
	const into = collapseOf(node);
	const width = overlayWidthOf(into, how.viewportPx ?? DRAWER_MAX_PX) - 2 * REGION_PAD_PX;
	const opened: LayPlace = {
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

function foldNode(node: BoxNode, how: LayPlace, side: ScreenSide): LaidCollapsed {
	return { ...collapseNode(node, how, side), into: HIDE, isFolded: true };
}

const awayNode = (node: BoxNode, how: LayPlace, side: ScreenSide): LaidCollapsed =>
	isFoldedAway(node) ? foldNode(node, how, side) : collapseNode(node, how, side);

interface RowWithout {
	readonly sized: readonly SizedCell[];
	readonly leaves: (node: BoardNode) => boolean;
}

// TRADE-OFF: the row keeps its collapsed children in place as zero-width entries, so every path stays the note's; its ratio grips are not drawn while any child is collapsed
function layRowWithout(node: BoxNode, width: number, how: LayPlace, { sized, leaves }: RowWithout): LaidBox {
	let taken = 0;
	return {
		...boxShape(node, ROW, width, how),
		isStacked: false,
		hasCollapsed: true,
		of: node.of.map((child, at) => {
			const placed = placeChild(node, { ...how, childAcross: sized.length }, at, ROW);
			if (isBox(child) && leaves(child)) return awayNode(child, placed.how, sideAt(node, at));
			const size = sized[taken] ?? UNSIZED;
			taken += 1;
			return { ...layNode(child, size.width, placed.how), ...size, ...placed.divider };
		}),
	};
}

// TRADE-OFF: a child of a column declares `basis: "auto"` so its own height survives; flex-basis 0 would replace the height with the content's, which is what silently ate every height a column held
function layColumn(node: BoxNode, width: number, inner: number, how: LayPlace, isCollapsing = false): LaidBox {
	return {
		...boxShape(node, COLUMN, width, how),
		isStacked: false,
		of: node.of.map((child, at): LaidChild => {
			const placed = placeChild(node, how, at, COLUMN);
			if (isBox(child) && isFoldedAway(child)) return foldNode(child, placed.how, sideAt(node, at));
			if (isCollapsing && isBox(child) && isCollapsible(child))
				return collapseNode(child, placed.how, sideAt(node, at));
			return { ...layNode(child, inner, placed.how), ...placed.divider, grow: 0, basis: "auto" };
		}),
	};
}

// TRADE-OFF: every child is laid out, the hidden ones included, because a view that is not on screen keeps its widgets mounted and its refs alive — which is the whole reason this box exists
function laySwap(node: BoxNode, width: number, inner: number, how: LayPlace): LaidBox {
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

function wearInRegion(leaf: LeafNode, how: LayPlace): LeafNode {
	if (leaf.surface !== undefined) return leaf;
	if (!REGIONS_THAT_PLATE.some((role) => role === how.regionRole)) return leaf;
	if (how.underSurface !== NO_SURFACE) return leaf;
	const { role } = how.ask(leaf.id);
	if (ROLES_LEFT_BARE.some((bare) => bare === role)) return leaf;
	return { ...leaf, surface: GROUP };
}
