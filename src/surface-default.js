import { surfaceVerdicts } from "./surface-laws.js";
import { isBox, NO_SURFACE, pathKey, replacedAt } from "./tree.js";

export function withDefaultSurfaces({ layout, tiles, roleOf = () => null }) {
	const { verdicts } = surfaceVerdicts({ layout, tiles, measured: null, roleOf });
	let laid = layout;
	for (const verdict of verdicts) {
		if (!wantsWriting(verdict, laid)) continue;
		laid = replacedAt(laid, verdict.path, { ...nodeOn(laid, verdict.path), surface: verdict.advised });
	}
	return laid;
}

function wantsWriting(verdict, laid) {
	if (verdict.advised === NO_SURFACE) return false;
	const node = nodeOn(laid, verdict.path);
	return isBox(node) && node.surface === undefined;
}

function nodeOn(laid, path) {
	return path.reduce((node, at) => node?.of?.[at], laid);
}

export function surfacesWritten(layout) {
	const found = {};
	walk(layout, [], (node, path) => {
		if (node.surface) found[pathKey(path)] = node.surface;
	});
	return found;
}

function walk(node, path, say) {
	if (path.length > 0) say(node, path);
	if (!isBox(node)) return;
	node.of.forEach((child, at) => walk(child, [...path, at], say));
}
