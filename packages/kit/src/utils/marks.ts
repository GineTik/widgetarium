import { MARK_SHAPES, MARK_SHAPE_NAMES, MARK_TONE_NAMES, SHAPE_STREAM, TONE_STREAM } from "../constants/marks";
import type { MarkShape } from "../constants/marks";
import type { ToneName } from "../constants/tones";
import { isOneOf } from "./is-one-of";

export interface Mark {
	readonly shape: MarkShape;
	readonly tone: ToneName;
}

export function markOf(seed: unknown): Mark {
	const hash = hashOf(String(seed ?? ""));
	return {
		shape: pickedFrom(MARK_SHAPE_NAMES, stir(hash ^ SHAPE_STREAM), "disc"),
		tone: pickedFrom(MARK_TONE_NAMES, stir(hash ^ TONE_STREAM), "accent"),
	};
}

export function pathOf(name: unknown): string | null {
	return isOneOf(MARK_SHAPE_NAMES, name) ? MARK_SHAPES[name] : null;
}

function hashOf(text: string): number {
	let held = 2166136261;
	for (let at = 0; at < text.length; at += 1) held = Math.imul(held ^ text.charCodeAt(at), 16777619);
	return held >>> 0;
}

function stir(held: number): number {
	const once = Math.imul(held ^ (held >>> 16), 2246822507);
	const twice = Math.imul(once ^ (once >>> 13), 3266489909);
	return (twice ^ (twice >>> 16)) >>> 0;
}

function pickedFrom<W>(held: readonly W[], at: number, fallback: W): W {
	return held[at % held.length] ?? fallback;
}
