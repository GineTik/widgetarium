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
export const SWAP = "swap";

export const STACK = "stack";
export const DRAWER = "drawer";
export const SHEET = "sheet";
export const MENU = "menu";
export const HIDE = "hide";
export const COLLAPSES = [STACK, DRAWER, SHEET, MENU, HIDE];
export const ALWAYS = "always";
export const ADAPTIVE = "adaptive";
export const TOGGLES = [ALWAYS, ADAPTIVE];
export const MENU_PX = 360;

export const GROUP = "group";
export const OBJECT = "object";
export const APART = "apart";
export const NO_SURFACE = "none";
export const SURFACES = [GROUP, OBJECT, APART, NO_SURFACE];
export const SURFACE_WAS = { fill: GROUP, outline: OBJECT, raise: GROUP, item: GROUP, divider: APART };
export const SIDES = ["start", "end"];
export const STEP_PX = [24, 16, 8];
export const SURFACE_PAD_PX = 16;
export const CORNER_STEP_PX = 8;
export const MIN_GAP_PX = 8;
export const PLATE_CORNER_PX = 14;
export const MIN_CORNER_PX = 4;
export const TEXT_ROLE = "text";

export function byPath(root, pick) {
	return Object.fromEntries(
		[root, ...root.querySelectorAll("[data-path]")]
			.filter((node) => typeof node.dataset?.path === "string" && node.dataset.path !== "")
			.map((node) => [node.dataset.path, pick(node)]),
	);
}

export function isBox(node) {
	return Array.isArray(node?.of);
}

function isLeaf(node) {
	if (isBox(node)) return false;
	return typeof node?.id === "string" && node.id !== "";
}

const PLATES = new Set([GROUP, OBJECT]);
export const isPainted = (node) => PLATES.has(node?.surface);
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

function holdsPeers(box, ask) {
	if (box.of.length < 2 || !box.of.every(isLeaf)) return false;
	const widgets = new Set(box.of.map((child) => ask(child.id).widget));
	return widgets.size === 1 && !widgets.has(undefined);
}

const isHeading = (node, ask) => isLeaf(node) && ask(node.id).role === TEXT_ROLE;

export function seenGapOf(box, at, space) {
	const isCloser = holdsPeers(box, space.ask) || isHeading(box.of[at], space.ask);
	return stepOf(isCloser ? space.level + 1 : space.level);
}

const START_SIDES = new Set(["left", "top"]);
const isAlong = (dir, side) =>
	dir === ROW ? side === "left" || side === "right" : side === "top" || side === "bottom";

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

export function collapseOf(node) {
	const into = typeof node?.collapse === "string" ? node.collapse : node?.collapse?.into;
	if (COLLAPSES.includes(into)) return into;
	return node?.foldable === true ? DRAWER : STACK;
}

export function isAlwaysToggled(node) {
	return isBox(node) && (node.collapse?.toggle === ALWAYS || node.foldable === true);
}

const isCollapsible = (node) => isBox(node) && collapseOf(node) !== STACK;

export function regionCollapseOf(root, at) {
	const into = collapseOf(root.of[at]);
	return into === STACK ? DRAWER : into;
}

export const openKeyOf = (node, path) => node.trigger ?? `collapse:${node.id ?? pathKey(path)}/open`;

export function overlayWidthOf(into, viewportPx) {
	if (into === MENU) return Math.min(MENU_PX, viewportPx);
	return into === SHEET ? viewportPx : drawerWidth(viewportPx);
}

export function togglesUnder(box) {
	return (box?.of ?? []).flatMap((child, at) => togglesWithin(child, sideAt(box, at)));
}

function togglesWithin(node, side) {
	if (node?.kind === "collapsed") return [node, ...togglesUnder(node.node)];
	const within = togglesUnder(node);
	return node?.kind === "box" && node.isAlwaysToggled ? [{ ...node, side }, ...within] : within;
}

const isFoldedAway = (node) => isAlwaysToggled(node) && node.folded === true;
const leavesNarrowRow = (node) => isFoldedAway(node) || isCollapsible(node);

export const isDividedByDefault = (region) => isCollapsible(region) && region.of?.length > 0;

export function regionSurfaceOf(root, at) {
	const region = root.of[at];
	if (region?.surface) return { surface: region.surface, side: region.side ?? facingKept(root, at) };
	return isDividedByDefault(region)
		? { surface: APART, side: facingKept(root, at) }
		: { surface: NO_SURFACE, side: null };
}

const facingKept = (root, at) => (at < keptAt(root) ? "end" : "start");

export function laidRegion(root, at, given, { ask, isFloating = false, viewportPx = given }) {
	const worn = isFloating ? { surface: NO_SURFACE, side: null } : regionSurfaceOf(root, at);
	const pad = isPainted(worn) ? SURFACE_PAD_PX : REGION_PAD_PX;
	const plates = isPainted(worn) ? 1 : 0;
	const node = laid(withoutSurface(root.of[at]), given - pad * 2, {
		ask,
		path: [at],
		edges: allEdges(pad),
		plates,
		underSurface: isPainted(worn) ? worn.surface : NO_SURFACE,
		level: 0,
		viewportPx,
	});
	return { worn, plate: plates ? plateOf(1) : null, node };
}

export function withoutSurface(node) {
	const { surface, side, ...bare } = node;
	return surface === undefined && side === undefined ? node : bare;
}

const DECLARED_KEYS = [
	"keep",
	"foldable",
	"folded",
	"collapse",
	"trigger",
	"width",
	"scroll",
	"name",
	"id",
	"surface",
	"role",
	"purpose",
];

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
	return { ...child, ratio: box.ratio ?? child.ratio ?? 1 };
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

export function withHeight(root, path, heightPx, sizing) {
	const node = nodeAt(root, path);
	return node ? replacedAt(root, path, resizedTo(node, path, heightPx, sizing)) : root;
}

function resizedTo(node, path, heightPx, sizing) {
	if (!isBox(node)) {
		const held = heldHeight(node, { wantedPx: heightPx, ask: sizing.ask, give: sizing.give });
		return heightWritten(node, held, Number(drawnAt(sizing.drawnAs, path).across));
	}
	const shares = sharesOf(node, path, heightPx, sizing.drawnAs);
	return {
		...node,
		of: node.of.map((child, at) => (shares[at] === null ? child : resizedTo(child, [...path, at], shares[at], sizing))),
	};
}

function heightWritten(leaf, heightPx, across) {
	if (!across) return { ...leaf, height: heightPx };
	return { ...leaf, heights: { ...leaf.heights, [across]: heightPx } };
}

function heightAcross(leaf, across) {
	if (!across) return leaf.height;
	const wider = Object.keys(leaf.heights ?? {})
		.map(Number)
		.filter((key) => key >= across)
		.sort((one, other) => one - other);
	return wider.length > 0 ? leaf.heights[wider[0]] : leaf.height;
}

export const pathKey = (path) => path.join("/");

const drawnAt = (drawnAs, path) => drawnAs[pathKey(path)] ?? {};

function sharesOf(box, path, heightPx, drawnAs) {
	const heights = box.of.map((child, at) => drawnAt(drawnAs, [...path, at]).heightPx ?? heightOf(child));
	const extra = heightPx - (drawnAt(drawnAs, path).heightPx ?? heightOf(box));
	const total = heights.reduce((sum, one) => sum + one, 0);
	const drawnCount = heights.filter((one) => one > 0).length;
	const shareOf = (one) => {
		if (one === 0) return null;
		if (box.dir === COLUMN) return one + (extra * one) / total;
		return drawnAt(drawnAs, path).dir === COLUMN ? (total + extra) / drawnCount : widest(heights) + extra;
	};
	return heights.map(shareOf);
}

export function handedDown(node, heightPx) {
	if (!isBox(node)) return node.height ? node : { ...node, height: Math.max(Math.round(heightPx), MIN_HEIGHT_PX) };
	const inner = heightPx - 2 * insetOf(node);
	if (node.dir !== COLUMN) return { ...node, of: node.of.map((child) => handedDown(child, inner)) };
	const unsized = node.of.filter((child) => heightOf(child) === 0);
	if (unsized.length === 0) return node;
	const share = (inner - stackedPx(node, node.of.map(heightOf), UNDRAWN_SPACE)) / unsized.length;
	return { ...node, of: node.of.map((child) => (unsized.includes(child) ? handedDown(child, share) : child)) };
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

export function heightOf(node) {
	if (node?.height) return node.height;
	if (!isBox(node)) return 0;
	const heights = node.of.map(heightOf);
	const inset = 2 * insetOf(node);
	const tallest = widest(heights);
	if (node.dir !== COLUMN) return tallest && tallest + inset;
	if (heights.some((one) => one === 0)) return 0;
	return stackedPx(node, heights, UNDRAWN_SPACE) + inset;
}

function stackedPx(column, heights, space) {
	return [...heights, ...gapsOf(column, space, COLUMN)].reduce((sum, one) => sum + one, 0);
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

export const allEdges = (px) => ({ top: px, bottom: px, left: px, right: px });

export function edgesOfChild(box, edges, at, dir = box.dir, space = UNDRAWN_SPACE) {
	const base = isPainted(box) ? allEdges(SURFACE_PAD_PX) : edges;
	if (dir === SWAP) return { ...base, top: box.strip === false ? base.top : null };
	const ends = { isFirst: at === 0, isLast: at === box.of.length - 1 };
	return dir === ROW ? edgesInRow(base, ends) : edgesInColumn(base, ends);
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

function placedChild(box, how, at, dir) {
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

function laidRow(node, width, how, sized) {
	return {
		...boxShape(node, ROW, width, how),
		isStacked: false,
		of: node.of.map((child, at) => {
			const placed = placedChild(node, how, at, ROW);
			return { ...laid(child, sized[at].width, placed.how), ...sized[at], ...placed.divider };
		}),
	};
}

export function laid(node, width, how) {
	const held = { path: [], edges: allEdges(0), plates: 0, underSurface: NO_SURFACE, level: 0, ...how };
	if (!isBox(node)) return laidLeaf(node, width, held);
	const inner = width - 2 * insetOf(node);
	if (node.dir === SWAP) return laidSwap(node, width, inner, held);
	if (node.dir === COLUMN) return laidColumn(node, width, inner, held);
	const standing = { ...node, of: node.of.filter((child) => !isFoldedAway(child)) };
	const sized = sharedWidths(standing, inner, spaceOf(held));
	if (!mustStack(standing, sized, held.ask)) {
		if (standing.of.length === node.of.length) return laidRow(node, width, held, sized);
		return laidRowWithout(node, width, held, { sized, leaves: isFoldedAway });
	}
	if (isCollapsible(node) && held.path.length > 1 && held.opened !== pathKey(held.path))
		return collapsedNode(node, held, "left");
	const kept = { ...node, of: node.of.filter((child) => !leavesNarrowRow(child)) };
	const keptSized = sharedWidths(kept, inner, spaceOf(held));
	const isCollapsing = kept.of.length !== node.of.length;
	if (!isCollapsing || mustStack(kept, keptSized, held.ask)) {
		return {
			...laidColumn(node, width, inner, { ...held, childAcross: 1 }, isCollapsing),
			isStacked: true,
			hasCollapsed: isCollapsing,
		};
	}
	return laidRowWithout(node, width, held, { sized: keptSized, leaves: leavesNarrowRow });
}

function collapsedNode(node, how, side) {
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
		node: laid(node, width, opened),
	};
}

function foldedNode(node, how, side) {
	return { ...collapsedNode(node, how, side), into: HIDE, isFolded: true };
}

const awayNode = (node, how, side) =>
	isFoldedAway(node) ? foldedNode(node, how, side) : collapsedNode(node, how, side);

const sideAt = (box, at) => (box.of.length > 1 && at === box.of.length - 1 ? "right" : "left");

// TRADE-OFF: the row keeps its collapsed children in place as zero-width entries, so every path stays the note's; its ratio grips are not drawn while any child is collapsed
function laidRowWithout(node, width, how, { sized, leaves }) {
	let taken = 0;
	return {
		...boxShape(node, ROW, width, how),
		isStacked: false,
		hasCollapsed: true,
		of: node.of.map((child, at) => {
			const placed = placedChild(node, { ...how, childAcross: sized.length }, at, ROW);
			if (leaves(child)) return awayNode(child, placed.how, sideAt(node, at));
			const size = sized[taken];
			taken += 1;
			return { ...laid(child, size.width, placed.how), ...size, ...placed.divider };
		}),
	};
}

// TRADE-OFF: a child of a column declares `basis: "auto"` so its own height survives; flex-basis 0 would replace the height with the content's, which is what silently ate every height a column held
function laidColumn(node, width, inner, how, isCollapsing = false) {
	return {
		...boxShape(node, COLUMN, width, how),
		isStacked: false,
		of: node.of.map((child, at) => {
			const placed = placedChild(node, how, at, COLUMN);
			if (isFoldedAway(child)) return foldedNode(child, placed.how, sideAt(node, at));
			if (isCollapsing && isCollapsible(child)) return collapsedNode(child, placed.how, sideAt(node, at));
			return { ...laid(child, inner, placed.how), ...placed.divider, grow: 0, basis: "auto" };
		}),
	};
}

// TRADE-OFF: every child is laid out, the hidden ones included, because a view that is not on screen keeps its widgets mounted and its refs alive — which is the whole reason this box exists
function laidSwap(node, width, inner, how) {
	return {
		...boxShape(node, SWAP, width, how),
		isStacked: false,
		id: node.id,
		strip: node.strip !== false,
		of: node.of.map((child, at) => {
			const placed = placedChild(node, how, at, SWAP);
			return { ...laid(child, inner, placed.how), ...placed.divider, ...slotOf(child), grow: 0, basis: "auto" };
		}),
	};
}

const slotOf = (child) => ({ name: child.name ?? "", ...(child.hidden ? { hidden: true } : {}) });

export function holdsOf(box) {
	return box.of.map(slotOf);
}

export function shownIn(rows, chosen) {
	const open = rows.filter((row) => !row.hidden);
	const held = open.find((row) => row.name === chosen) ?? open[0] ?? null;
	return held?.name ?? null;
}

const emptyView = (name) => ({ dir: COLUMN, of: [], name });

function heldFor(box, row) {
	const found = box.of.find((child) => child.name === (row.was ?? row.name));
	const { hidden, ...kept } = found ?? emptyView(row.name);
	return { ...kept, name: row.name, ...(row.hidden ? { hidden: true } : {}) };
}

export function swapBoxes(root, path = []) {
	if (!isBox(root)) return [];
	const within = root.of.flatMap((child, at) => swapBoxes(child, [...path, at]));
	return root.dir === SWAP ? [{ path, box: root }, ...within] : within;
}

export function withHolds(root, path, rows) {
	const box = nodeAt(root, path);
	if (!isBox(box)) return root;
	return replacedAt(root, path, { ...box, of: rows.map((row) => heldFor(box, row)) });
}

const limitsOf = (declared) => ({ minPx: declared.minPx ?? 0, cap: declared.cap ?? 0 });

function laidLeaf(node, width, how) {
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
		height: heightAcross(node, how.across) ?? null,
		across: how.across ?? null,
		...surfaceFields(node),
		...plateFields(node, how),
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
function aimedInSwap(spots, over, pointer) {
	const shown = childrenOf(spots, over)[0];
	return shown ? besideOrWrap(spots, shown, pointer) : null;
}

export function aimedAt(spots, x, y) {
	const pointer = { x, y };
	const over = spots
		.filter((spot) => isOver(spot, pointer))
		.sort((one, other) => other.path.length - one.path.length)[0];
	if (!over) return null;
	if (over.dir === SWAP) return aimedInSwap(spots, over, pointer);
	if (over.kind === "box") return { kind: "beside", box: over.path, at: slotIn(spots, over, pointer) };
	return besideOrWrap(spots, over, pointer);
}

export function sameTarget(one, other) {
	if (!one || !other) return one === other;
	if (one.kind !== other.kind) return false;
	if (one.kind === "wrap") return samePath(one.path, other.path) && one.axis === other.axis && one.side === other.side;
	return samePath(one.box, other.box) && one.at === other.at;
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

const withoutArrangements = ({ heights, ...leaf }) => leaf;

const NOTHING_AT_PATH = "Widgetarium: no box stands at {path}, so the tile was left where it was.";

export function movedInto(root, id, target) {
	const from = pathOfLeaf(root, id);
	if (from === null || !target) return root;
	const held = nodeAt(root, from);
	const blanked = replacedAt(root, from, GONE);
	if (target.kind === "wrap") {
		const wrapped = nodeAt(blanked, target.path);
		if (!wrapped || wrapped.gone) return root;
		return pruned(replacedAt(blanked, target.path, wrapping(wrapped, withoutArrangements(held), target)));
	}
	const isSameBox = samePath(target.box, from.slice(0, -1));
	const grown = insertedAt(blanked, target.box, target.at, isSameBox ? held : withoutArrangements(held));
	if (grown === null) {
		console.warn(NOTHING_AT_PATH.replace("{path}", target.box.join("/")));
		return root;
	}
	return pruned(grown);
}

export function keptAt(root) {
	return root.of.findIndex((child) => child.keep === true);
}

export function isFolded(root, at) {
	return Boolean(root.of[at]?.folded);
}

export function toggledFoldAt(root, path) {
	const node = nodeAt(root, path);
	return isBox(node) ? replacedAt(root, path, { ...node, folded: !node.folded }) : root;
}

export function toggledFold(root, at) {
	return toggledFoldAt(root, [at]);
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

const roomLeftBy = (root, held, width, gap) => width - held.reduce((sum, at) => sum + gap + sidebarWidth(root, at), 0);

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
