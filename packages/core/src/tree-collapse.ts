import { APART, NO_SURFACE } from "@widgetarium/kit/plates";
import { ALWAYS, MENU, MENU_PX, SHEET, STACK, DRAWER } from "./tree-constants.js";
import { isBox, pathKey } from "./tree-nodes.js";
import { drawerWidth, keptAt } from "./tree-columns.js";
import type { ScreenSide } from "./tree-columns.js";
import type { BoardNode, BoxNode, CollapseKind, HeldNode, NodePath, SurfaceSide, SurfaceWord } from "./tree-nodes.js";
import type { LaidBox, LaidChild, LaidCollapsed, LaidNode } from "./tree.js";

export interface RegionSurface {
	readonly surface: SurfaceWord;
	readonly side: SurfaceSide | null;
}

type SidedBox = Omit<LaidBox, "side"> & { readonly side: ScreenSide };

export type Toggle = LaidCollapsed | SidedBox;

export function collapseOf(node: HeldNode): CollapseKind {
	return (isBox(node) ? node.collapse?.into : undefined) ?? STACK;
}

export function isAlwaysToggled(node: HeldNode): boolean {
	return isBox(node) && node.collapse?.toggle === ALWAYS;
}

export const isCollapsible = (node: HeldNode): boolean => isBox(node) && collapseOf(node) !== STACK;

export function regionCollapseOf(root: BoxNode, at: number): CollapseKind {
	const into = collapseOf(root.of[at]);
	return into === STACK ? DRAWER : into;
}

export const openKeyOf = (node: BoardNode, path: NodePath): string =>
	(isBox(node) ? node.trigger : undefined) ?? `collapse:${node.id ?? pathKey(path)}/open`;

export function overlayWidthOf(into: CollapseKind, viewportPx: number): number {
	if (into === MENU) return Math.min(MENU_PX, viewportPx);
	return into === SHEET ? viewportPx : drawerWidth(viewportPx);
}

export function togglesUnder(box: LaidNode | null | undefined): Toggle[] {
	if (box?.kind !== "box") return [];
	return box.of.flatMap((child, at) => togglesWithin(child, sideAt(box, at)));
}

export const isFoldedAway = (node: HeldNode): boolean => isBox(node) && isAlwaysToggled(node) && node.folded === true;

export const leavesNarrowRow = (node: HeldNode): boolean => isFoldedAway(node) || isCollapsible(node);

export const isDividedByDefault = (region: HeldNode): boolean =>
	isBox(region) && isCollapsible(region) && region.of.length > 0;

export function regionSurfaceOf(root: BoxNode, at: number): RegionSurface {
	const region = root.of[at];
	if (region?.surface) return { surface: region.surface, side: region.side ?? facingKept(root, at) };
	return isDividedByDefault(region)
		? { surface: APART, side: facingKept(root, at) }
		: { surface: NO_SURFACE, side: null };
}

export const sideAt = (box: { readonly of: readonly unknown[] }, at: number): ScreenSide =>
	box.of.length > 1 && at === box.of.length - 1 ? "right" : "left";

function togglesWithin(node: LaidChild, side: ScreenSide): Toggle[] {
	if (node.kind === "collapsed") return [node, ...togglesUnder(node.node)];
	const within = togglesUnder(node);
	return node.kind === "box" && node.isAlwaysToggled ? [{ ...node, side }, ...within] : within;
}

const facingKept = (root: BoxNode, at: number): SurfaceSide => (at < keptAt(root) ? "end" : "start");
