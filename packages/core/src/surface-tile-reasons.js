import { colorOf, contrastOf, lightnessOf, over } from "./color-math.js";
import { MAX_SURFACE_DEPTH } from "./surface-roles.js";
import { isPainted } from "./tree.js";

const LIGHTNESS_STEP = 2;
const TEXT_CONTRAST = 4.5;
const FAINT_TEXT_KEEPS = 0.85;

export const WHITE = { r: 1, g: 1, b: 1, a: 1 };

export function depthReason(tiles, levels) {
	const unmeasured = tiles.filter((tile) => !tile.measured).map((tile) => tile.id);
	if (unmeasured.length > 0) return `- ${unmeasured.join(", ")} not measured yet, so its depth is unknown (law 10)`;
	const deepest = Math.max(0, ...tiles.map((tile) => tile.measured.depth));
	const total = levels + 1 + deepest;
	if (total > MAX_SURFACE_DEPTH)
		return `- ${total} containers deep: ${levels} surface(s) above, this one, ${deepest} inside the widgets (law 5 allows ${MAX_SURFACE_DEPTH})`;
	return `+ ${total} of ${MAX_SURFACE_DEPTH} containers deep (law 5)`;
}

export function standsOutReason(colour, under) {
	const step = stepBetween(colour, under);
	return step >= LIGHTNESS_STEP
		? `+ ${round(step)} from what it stands on (law 6)`
		: `- only ${round(step)} from what it stands on, under ${LIGHTNESS_STEP} (law 6)`;
}

export function tileReasons({ id, measured }, colour, page) {
	if (!measured) return [];
	const fills = measured.fills
		.map((fill) => ({ ...fill, step: stepBetween(over(colorOf(fill.color) ?? WHITE, colour), colour) }))
		.filter((fill) => fill.step < LIGHTNESS_STEP)
		.map((fill) => `- ${id} holds a ${fill.kind} only ${round(fill.step)} from this surface (law 7)`);
	const texts = measured.texts
		.map((text) => textShortfall(colorOf(text) ?? WHITE, colour, page))
		.filter(Boolean)
		.map(
			(short) =>
				`- ${id} has text at ${round(short.onSurface)}:1 on this surface, under the ${round(short.floor)}:1 it must keep (law 8)`,
		);
	if (fills.length === 0 && texts.length === 0)
		return [`+ ${id}: its fills stand apart and its text reads (laws 7, 8)`];
	return [...fills, ...texts];
}

export function presetColour(measured, { under, underSurface }) {
	const token = isPainted({ surface: underSurface }) ? measured?.presets?.inset : measured?.presets?.fill;
	return over(colorOf(token) ?? WHITE, under);
}

export function measuredTileOf(raw) {
	if (!Number.isFinite(raw?.depth)) return null;
	const fills = Array.isArray(raw.fills)
		? raw.fills
				.filter((fill) => colorOf(fill?.color))
				.map((fill) => ({ kind: fill.kind ?? fill.role, color: fill.color }))
		: [];
	const texts = Array.isArray(raw.texts) ? raw.texts.filter((text) => colorOf(text)) : [];
	return { depth: raw.depth, fills, texts };
}

function round(value) {
	return Math.round(value * 10) / 10;
}

function stepBetween(one, other) {
	return Math.abs(lightnessOf(one) - lightnessOf(other));
}

function textShortfall(ink, surface, page) {
	const onSurface = contrastOf(over(ink, surface), surface);
	const onPage = contrastOf(over(ink, page), page);
	const floor = onPage >= TEXT_CONTRAST ? TEXT_CONTRAST : onPage * FAINT_TEXT_KEEPS;
	return onSurface < floor ? { onSurface, floor } : null;
}
