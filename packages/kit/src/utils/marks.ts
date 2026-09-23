import { MARK_SHAPES, MARK_SHAPE_NAMES, MARK_TONE_NAMES, SHAPE_STREAM, TONE_STREAM } from "../constants/marks";

export function markOf(seed) {
	const hash = hashOf(String(seed ?? ""));
	return {
		shape: pickedFrom(MARK_SHAPE_NAMES, stirred(hash ^ SHAPE_STREAM)),
		tone: pickedFrom(MARK_TONE_NAMES, stirred(hash ^ TONE_STREAM)),
	};
}

export function pathOf(name) {
	return Object.hasOwn(MARK_SHAPES, name) ? MARK_SHAPES[name] : null;
}

function hashOf(text) {
	let held = 2166136261;
	for (let at = 0; at < text.length; at += 1) held = Math.imul(held ^ text.charCodeAt(at), 16777619);
	return held >>> 0;
}

function stirred(held) {
	const once = Math.imul(held ^ (held >>> 16), 2246822507);
	const twice = Math.imul(once ^ (once >>> 13), 3266489909);
	return (twice ^ (twice >>> 16)) >>> 0;
}

function pickedFrom(held, at) {
	return held[at % held.length];
}
