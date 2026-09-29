import { APART, NO_SURFACE } from "@widgetarium/kit/plates";
import { ALWAYS, COLLAPSES, DRAWER, MENU, MENU_PX, SHEET, STACK } from "./tree-constants.js";
import { isBox, pathKey } from "./tree-nodes.js";
import { drawerWidth, keptAt } from "./tree-columns.js";

export function collapseOf(node) {
	const into = typeof node?.collapse === "string" ? node.collapse : node?.collapse?.into;
	if (COLLAPSES.includes(into)) return into;
	return node?.foldable === true ? DRAWER : STACK;
}

export function isAlwaysToggled(node) {
	return isBox(node) && (node.collapse?.toggle === ALWAYS || node.foldable === true);
}

export const isCollapsible = (node) => isBox(node) && collapseOf(node) !== STACK;

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

export const isFoldedAway = (node) => isAlwaysToggled(node) && node.folded === true;

export const leavesNarrowRow = (node) => isFoldedAway(node) || isCollapsible(node);

export const isDividedByDefault = (region) => isCollapsible(region) && region.of?.length > 0;

export function regionSurfaceOf(root, at) {
	const region = root.of[at];
	if (region?.surface) return { surface: region.surface, side: region.side ?? facingKept(root, at) };
	return isDividedByDefault(region)
		? { surface: APART, side: facingKept(root, at) }
		: { surface: NO_SURFACE, side: null };
}

export const sideAt = (box, at) => (box.of.length > 1 && at === box.of.length - 1 ? "right" : "left");

function togglesWithin(node, side) {
	if (node?.kind === "collapsed") return [node, ...togglesUnder(node.node)];
	const within = togglesUnder(node);
	return node?.kind === "box" && node.isAlwaysToggled ? [{ ...node, side }, ...within] : within;
}

const facingKept = (root, at) => (at < keptAt(root) ? "end" : "start");
