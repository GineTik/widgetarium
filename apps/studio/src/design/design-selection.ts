import { NODE_MARK } from "@widgetarium/core/engine/node-marks.js";
import type { Box } from "../canvas/flight.js";
import type { Layer } from "./layer-tree.js";

export interface Hit {
	readonly mark: string;
	readonly box: Box;
	readonly radius: number;
	readonly siblings: number;
}

export interface Point {
	readonly x: number;
	readonly y: number;
}

export type PickDepth = "level" | "deeper" | "deepest";

export const LIVE_SCREEN = "data-wg-live-screen";

export function hitsAt(root: HTMLElement, layers: readonly Layer[], at: Point): Hit[] {
	const origin = root.getBoundingClientRect();
	const scale = origin.width / Math.max(1, root.offsetWidth);
	const client = { x: origin.left + at.x * scale, y: origin.top + at.y * scale };
	const hits: Hit[] = [];
	let level = layers;
	while (level.length > 0) {
		const found = level.flatMap((layer) => {
			const rect = rectUnder(root, layer.mark, client);
			return rect ? [{ layer, rect }] : [];
		});
		const deepest = found[found.length - 1];
		if (!deepest) return hits;
		hits.push({
			mark: deepest.layer.mark,
			box: boxIn(deepest.rect.drawn, origin, scale),
			radius: deepest.rect.radius,
			siblings: level.length,
		});
		level = deepest.layer.children;
	}
	return hits;
}

export function hitOfMark(root: HTMLElement, mark: string): Hit | null {
	const element = root.querySelector(`[${NODE_MARK}="${CSS.escape(mark)}"]`);
	const drawn = element ? drawnRectOf(element) : null;
	if (!element || !drawn) return null;
	const origin = root.getBoundingClientRect();
	const scale = origin.width / Math.max(1, root.offsetWidth);
	return { mark, box: boxIn(drawn, origin, scale), radius: radiusOf(element), siblings: 1 };
}

export function pickedHit(
	hits: readonly Hit[],
	parents: ReadonlyMap<string, string | null>,
	picked: string | null,
	depth: PickDepth,
): Hit | null {
	if (depth === "deepest") return hits[hits.length - 1] ?? null;
	const at = hits.findIndex((hit) => hit.mark === picked);
	if (at >= 0) return depth === "deeper" ? (hits[at + 1] ?? hits[at] ?? null) : (hits[at] ?? null);
	const parent = picked ? parents.get(picked) : null;
	const besideParent = parent ? hits.findIndex((hit) => hit.mark === parent) : -1;
	if (besideParent >= 0) return hits[besideParent + 1] ?? null;
	const branching = hits.findIndex((hit) => hit.siblings > 1);
	return hits[branching >= 0 ? branching : hits.length - 1] ?? null;
}

export function parentsOf(layers: readonly Layer[], parent: string | null = null): Map<string, string | null> {
	const parents = new Map<string, string | null>();
	for (const layer of layers) {
		parents.set(layer.mark, parent);
		for (const [mark, above] of parentsOf(layer.children, layer.mark)) parents.set(mark, above);
	}
	return parents;
}

export function ancestorsOf(parents: ReadonlyMap<string, string | null>, mark: string | null): Set<string> {
	const above = new Set<string>();
	for (let at = mark ? parents.get(mark) : null; at; at = parents.get(at)) above.add(at);
	return above;
}

function rectUnder(root: HTMLElement, mark: string, client: Point): { drawn: DOMRect; radius: number } | null {
	for (const element of root.querySelectorAll(`[${NODE_MARK}="${CSS.escape(mark)}"]`)) {
		const drawn = drawnRectOf(element);
		if (drawn && isInside(drawn, client)) return { drawn, radius: radiusOf(element) };
	}
	return null;
}

function drawnRectOf(element: Element): DOMRect | null {
	const own = element.getBoundingClientRect();
	if (own.width > 0 || own.height > 0) return own;
	const rects = [...element.children].flatMap((child) => drawnRectOf(child) ?? []);
	if (rects.length === 0) return null;
	const left = Math.min(...rects.map((one) => one.left));
	const top = Math.min(...rects.map((one) => one.top));
	const right = Math.max(...rects.map((one) => one.right));
	const bottom = Math.max(...rects.map((one) => one.bottom));
	return new DOMRect(left, top, right - left, bottom - top);
}

function radiusOf(element: Element): number {
	const painted = element.getBoundingClientRect().width > 0 ? element : element.firstElementChild;
	if (!painted) return 0;
	return parseFloat(getComputedStyle(painted).borderTopLeftRadius) || 0;
}

function boxIn(drawn: DOMRect, origin: DOMRect, scale: number): Box {
	return {
		x: (drawn.left - origin.left) / scale,
		y: (drawn.top - origin.top) / scale,
		width: drawn.width / scale,
		height: drawn.height / scale,
	};
}

function isInside(rect: DOMRect, point: Point): boolean {
	return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}
