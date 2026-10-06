import { readNodeMark } from "@widgetarium/core/engine/node-marks.js";
import type { NodeMove } from "@widgetarium/core/engine/node-moves.js";
import type { Layer } from "./layer-tree.js";

export interface LayerMove extends NodeMove {
	readonly file: string;
}

export function layerMoveTo(dragged: string, parent: string, before: string | null): LayerMove | null {
	const from = readNodeMark(dragged);
	const into = readNodeMark(parent);
	const next = before ? readNodeMark(before) : null;
	if (!from || !into || into.file !== from.file || into.sourceKey !== from.sourceKey) return null;
	if (next && (next.file !== from.file || next.sourceKey !== from.sourceKey)) return null;
	return {
		file: from.file,
		sourceKey: from.sourceKey,
		from: from.start,
		into: into.start,
		before: next?.start ?? null,
	};
}

export function canHoldChildren(layer: Layer): boolean {
	return layer.kind !== "widget" && layer.kind !== "input" && layer.kind !== "text" && layer.kind !== "picture";
}
