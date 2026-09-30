import { isPainted, ROW } from "@widgetarium/kit/plates";
import { SURFACE_PAD_PX, SWAP } from "./tree-constants.js";
import type { BoxDirection, BoxNode } from "./tree-nodes.js";
import type { Edges } from "./tree-laid.js";

interface Ends {
	readonly isFirst: boolean;
	readonly isLast: boolean;
}

export const allEdges = (px: number): Edges => ({ top: px, bottom: px, left: px, right: px });

export function edgesOfChild(box: BoxNode, edges: Edges, at: number, dir: BoxDirection = box.dir): Edges {
	const base = isPainted(box) ? allEdges(SURFACE_PAD_PX) : edges;
	if (dir === SWAP) return { ...base, top: box.strip === false ? base.top : null };
	const ends = { isFirst: at === 0, isLast: at === box.of.length - 1 };
	return dir === ROW ? edgesInRow(base, ends) : edgesInColumn(base, ends);
}

function edgesInRow(base: Edges, { isFirst, isLast }: Ends): Edges {
	return { top: base.top, bottom: base.bottom, left: isFirst ? base.left : null, right: isLast ? base.right : null };
}

function edgesInColumn(base: Edges, { isFirst, isLast }: Ends): Edges {
	return { left: base.left, right: base.right, top: isFirst ? base.top : null, bottom: isLast ? base.bottom : null };
}
