import { readNodeMark } from "@widgetarium/core/engine/node-marks.js";
import type { Layer } from "./layer-tree.js";

export type DropPlace = "before" | "inside" | "after";

export interface LayerMove {
	readonly file: string;
	readonly from: number;
	readonly into: number;
	readonly before: number | null;
}

interface Placed {
	readonly layer: Layer;
	readonly parent: Layer | null;
	readonly next: Layer | null;
}

export function layerMoveOf(
	layers: readonly Layer[],
	dragged: string,
	target: string,
	place: DropPlace,
): LayerMove | null {
	const placed = placedLayersOf(layers);
	const at = placed.get(target);
	const from = readNodeMark(dragged);
	if (!at || !from || dragged === target) return null;
	const intoLayer = place === "inside" ? at.layer : at.parent;
	const beforeLayer = place === "before" ? at.layer : place === "after" ? at.next : null;
	const into = intoLayer ? readNodeMark(intoLayer.mark) : null;
	const before = beforeLayer ? readNodeMark(beforeLayer.mark) : null;
	if (!into || into.file !== from.file || (before && before.file !== from.file)) return null;
	return { file: from.file, from: from.start, into: into.start, before: before?.start ?? null };
}

export function canHoldChildren(layer: Layer): boolean {
	return layer.kind !== "widget" && layer.kind !== "input" && layer.kind !== "text" && layer.kind !== "picture";
}

function placedLayersOf(layers: readonly Layer[], parent: Layer | null = null): Map<string, Placed> {
	const placed = new Map<string, Placed>();
	layers.forEach((layer, at) => {
		placed.set(layer.mark, { layer, parent, next: layers[at + 1] ?? null });
		for (const [mark, inner] of placedLayersOf(layer.children, layer)) placed.set(mark, inner);
	});
	return placed;
}
