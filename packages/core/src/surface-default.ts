import { surfaceVerdicts } from "./surface-laws.js";
import type { RoleOf, TileWidget } from "./surface-laws.js";
import { isBox, nodeAt, NO_SURFACE, pathKey, replaceAt } from "./tree.js";
import type { BoardNode, BoxNode, NodePath, SurfaceWord } from "./tree.js";

interface DefaultSurfacesAsk {
	readonly layout: BoxNode;
	readonly tiles: readonly TileWidget[];
	readonly roleOf?: RoleOf;
}

export function withDefaultSurfaces({ layout, tiles, roleOf = () => null }: DefaultSurfacesAsk): BoxNode {
	const { verdicts } = surfaceVerdicts({ layout, tiles, measured: null, roleOf });
	let laid = layout;
	for (const verdict of verdicts) {
		const node = nodeAt(laid, verdict.path);
		if (!isBox(node) || node.surface !== undefined || verdict.advised === NO_SURFACE) continue;
		const written = replaceAt(laid, verdict.path, { ...node, surface: verdict.advised });
		if (isBox(written)) laid = written;
	}
	return laid;
}

export function surfacesWritten(layout: BoardNode): Record<string, SurfaceWord> {
	const found: Record<string, SurfaceWord> = {};
	walk(layout, [], (node, path) => {
		if (node.surface) found[pathKey(path)] = node.surface;
	});
	return found;
}

function walk(node: BoardNode, path: NodePath, say: (node: BoardNode, path: NodePath) => void): void {
	if (path.length > 0) say(node, path);
	if (!isBox(node)) return;
	node.of.forEach((child, at) => walk(child, [...path, at], say));
}
