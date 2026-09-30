import { holdBetween } from "./give.js";
import { DRAWER_MAX_PX, MAIN_FLOOR_PX, MIN_SIDEBAR_PX, REGION_GAP_PX, SIDEBAR_PX } from "./tree-constants.js";
import { isBox, nodeAt, replaceAt } from "./tree-nodes.js";
import type { BoxNode, NodePath } from "./tree-nodes.js";

export type ScreenSide = "left" | "right";

export interface StandingColumn {
	readonly at: number;
	readonly width: number;
}

export interface Columns {
	readonly beside: readonly StandingColumn[];
	readonly floating: readonly number[];
	readonly hidden: readonly number[];
	readonly alone: readonly number[];
}

interface WidenAsk {
	readonly wantedPx: number;
	readonly width: number;
	readonly gap?: number;
	readonly give?: boolean;
}

export function keptAt(root: BoxNode): number {
	return root.of.findIndex((child) => isBox(child) && child.keep === true);
}

export function isFolded(root: BoxNode, at: number): boolean {
	return Boolean(boxAt(root, at)?.folded);
}

export function toggleFoldAt(root: BoxNode, path: NodePath): BoxNode {
	const node = nodeAt(root, path);
	return isBox(node) ? replaceAt(root, path, { ...node, folded: !node.folded }) : root;
}

export function toggleFold(root: BoxNode, at: number): BoxNode {
	return toggleFoldAt(root, [at]);
}

export function sidebarWidth(root: BoxNode, at: number): number {
	return boxAt(root, at)?.width ?? SIDEBAR_PX;
}

export function sideOf(root: BoxNode, at: number): ScreenSide {
	const keep = keptAt(root);
	return keep >= 0 && at > keep ? "right" : "left";
}

const DRAWER_SHARE = 0.82;

export function drawerWidth(viewportPx: number): number {
	return Math.round(Math.min(viewportPx * DRAWER_SHARE, DRAWER_MAX_PX));
}

// TRADE-OFF: a drawer is offered only for the root's own children, because a box nested inside another has no window-wide layer to cover; a nested box out of width stacks instead
export function columnsOf(root: BoxNode, width: number, gap: number = REGION_GAP_PX): Columns {
	const all = [...root.of.keys()];
	const keep = keptAt(root);
	if (keep < 0) return { beside: [], floating: [], hidden: [], alone: all };
	const open = all.filter((at) => at !== keep && !isFolded(root, at));
	const kept = standingBeside({ root, open, keep, width, gap });
	const rest = all.filter((at) => at !== keep && !kept.includes(at));
	const cannotStand = (at: number): boolean => roomLeftBy(root, [...kept, at], width, gap) < MAIN_FLOOR_PX;
	return {
		beside: besideWidths({ root, all, kept, keep, room: roomLeftBy(root, kept, width, gap) }),
		floating: rest.filter(cannotStand),
		hidden: rest.filter((at) => !cannotStand(at)),
		alone: [],
	};
}

export function widenBox(root: BoxNode, at: number, { wantedPx, width, gap = REGION_GAP_PX, give }: WidenAsk): number {
	const keep = keptAt(root);
	const other = [...root.of.keys()].filter((index) => index !== keep && index !== at && !isFolded(root, index));
	const ceiling = roomLeftBy(root, other, width, gap) - gap - MAIN_FLOOR_PX;
	return Math.round(holdBetween(wantedPx, MIN_SIDEBAR_PX, ceiling, give));
}

function boxAt(root: BoxNode, at: number): BoxNode | null {
	const child = root.of[at];
	return isBox(child) ? child : null;
}

interface BesideAsk {
	readonly root: BoxNode;
	readonly all: readonly number[];
	readonly kept: readonly number[];
	readonly keep: number;
	readonly room: number;
}

function besideWidths({ root, all, kept, keep, room }: BesideAsk): StandingColumn[] {
	return all
		.filter((at) => at === keep || kept.includes(at))
		.map((at) => ({ at, width: at === keep ? room : sidebarWidth(root, at) }));
}

const roomLeftBy = (root: BoxNode, held: readonly number[], width: number, gap: number): number =>
	width - held.reduce((sum, at) => sum + gap + sidebarWidth(root, at), 0);

interface StandingAsk {
	readonly root: BoxNode;
	readonly open: readonly number[];
	readonly keep: number;
	readonly width: number;
	readonly gap: number;
}

// TRADE-OFF: the box farthest from the one that must stand is dropped first, because a person reads the far edge as the least attached to what they are looking at
function standingBeside({ root, open, keep, width, gap }: StandingAsk): readonly number[] {
	const farthestFirst = [...open].sort((one, other) => Math.abs(other - keep) - Math.abs(one - keep) || other - one);
	const tries = farthestFirst.map((_at, index) => farthestFirst.slice(index + 1));
	return [open, ...tries].find((held) => roomLeftBy(root, held, width, gap) >= MAIN_FLOOR_PX) ?? [];
}
