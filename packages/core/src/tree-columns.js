import { holdBetween } from "./give.js";
import { DRAWER_MAX_PX, MAIN_FLOOR_PX, MIN_SIDEBAR_PX, REGION_GAP_PX, SIDEBAR_PX } from "./tree-constants.js";
import { isBox, nodeAt, replaceAt } from "./tree-nodes.js";

export function keptAt(root) {
	return root.of.findIndex((child) => child.keep === true);
}

export function isFolded(root, at) {
	return Boolean(root.of[at]?.folded);
}

export function toggleFoldAt(root, path) {
	const node = nodeAt(root, path);
	return isBox(node) ? replaceAt(root, path, { ...node, folded: !node.folded }) : root;
}

export function toggleFold(root, at) {
	return toggleFoldAt(root, [at]);
}

export function sidebarWidth(root, at) {
	return root.of[at]?.width ?? SIDEBAR_PX;
}

export function sideOf(root, at) {
	const keep = keptAt(root);
	return keep >= 0 && at > keep ? "right" : "left";
}

const DRAWER_SHARE = 0.82;

export function drawerWidth(viewportPx) {
	return Math.round(Math.min(viewportPx * DRAWER_SHARE, DRAWER_MAX_PX));
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

export function widenBox(root, at, { wantedPx, width, gap = REGION_GAP_PX, give }) {
	const keep = keptAt(root);
	const other = root.of
		.map((child, index) => index)
		.filter((index) => index !== keep && index !== at && !isFolded(root, index));
	const ceiling = roomLeftBy(root, other, width, gap) - gap - MAIN_FLOOR_PX;
	return Math.round(holdBetween(wantedPx, MIN_SIDEBAR_PX, ceiling, give));
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
