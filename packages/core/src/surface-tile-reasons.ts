import { colorOf, contrastOf, lightnessOf, over } from "./color-math.js";
import type { Rgba } from "./color-math.js";
import { MAX_SURFACE_DEPTH } from "./surface-roles.js";
import { GROUP } from "./tree.js";
import type { SurfaceWord } from "./tree.js";
import { isObject } from "./engine/is-object.js";

export interface MeasuredPresets {
	readonly fill?: unknown;
	readonly inset?: unknown;
}

export interface MeasuredRead {
	readonly page?: unknown;
	readonly presets?: MeasuredPresets | null;
	readonly tiles?: Readonly<Record<string, unknown>> | null;
	readonly extents?: Readonly<Record<string, unknown>> | null;
}

export interface ReadFill {
	readonly kind: unknown;
	readonly color: string;
}

export interface ReadTile {
	readonly depth: number;
	readonly fills: readonly ReadFill[];
	readonly texts: readonly string[];
}

export interface TileMeasured {
	readonly id: string;
	readonly measured: ReadTile | null;
}

export interface Underneath {
	readonly under: Rgba;
	readonly underSurface: SurfaceWord;
}

const LIGHTNESS_STEP = 2;
const TEXT_CONTRAST = 4.5;
const FAINT_TEXT_KEEPS = 0.85;

export const WHITE: Rgba = { r: 1, g: 1, b: 1, a: 1 };

export function depthReason(tiles: readonly TileMeasured[], levels: number): string {
	const unmeasured = tiles.filter((tile) => !tile.measured).map((tile) => tile.id);
	if (unmeasured.length > 0) return `- ${unmeasured.join(", ")} not measured yet, so its depth is unknown (law 10)`;
	const deepest = Math.max(0, ...tiles.map((tile) => tile.measured?.depth ?? 0));
	const total = levels + 1 + deepest;
	if (total > MAX_SURFACE_DEPTH)
		return `- ${total} containers deep: ${levels} surface(s) above, this one, ${deepest} inside the widgets (law 5 allows ${MAX_SURFACE_DEPTH})`;
	return `+ ${total} of ${MAX_SURFACE_DEPTH} containers deep (law 5)`;
}

export function standsOutReason(colour: Rgba, under: Rgba): string {
	const step = stepBetween(colour, under);
	return step >= LIGHTNESS_STEP
		? `+ ${round(step)} from what it stands on (law 6)`
		: `- only ${round(step)} from what it stands on, under ${LIGHTNESS_STEP} (law 6)`;
}

export function tileReasons({ id, measured }: TileMeasured, colour: Rgba, page: Rgba): string[] {
	if (!measured) return [];
	const fills = measured.fills
		.map((fill) => ({ ...fill, step: stepBetween(over(colorOf(fill.color) ?? WHITE, colour), colour) }))
		.filter((fill) => fill.step < LIGHTNESS_STEP)
		.map((fill) => `- ${id} holds a ${String(fill.kind)} only ${round(fill.step)} from this surface (law 7)`);
	const texts = measured.texts
		.flatMap((text) => textShortfall(colorOf(text) ?? WHITE, colour, page) ?? [])
		.map(
			(short) =>
				`- ${id} has text at ${round(short.onSurface)}:1 on this surface, under the ${round(short.floor)}:1 it must keep (law 8)`,
		);
	if (fills.length === 0 && texts.length === 0)
		return [`+ ${id}: its fills stand apart and its text reads (laws 7, 8)`];
	return [...fills, ...texts];
}

export function presetColour(measured: MeasuredRead | null | undefined, { under, underSurface }: Underneath): Rgba {
	const token = underSurface === GROUP ? measured?.presets?.inset : measured?.presets?.fill;
	return over(colorIn(token) ?? WHITE, under);
}

export function colorIn(said: unknown): Rgba | null {
	return typeof said === "string" ? colorOf(said) : null;
}

export function measuredReadOf(raw: unknown): MeasuredRead | null {
	if (!isObject(raw)) return null;
	const { page, presets, tiles, extents } = raw;
	return {
		page,
		presets: isObject(presets) ? presets : null,
		tiles: isObject(tiles) ? tiles : null,
		extents: isObject(extents) ? extents : null,
	};
}

export function measuredTileOf(raw: unknown): ReadTile | null {
	if (!isObject(raw) || typeof raw["depth"] !== "number" || !Number.isFinite(raw["depth"])) return null;
	const { fills, texts } = raw;
	return {
		depth: raw["depth"],
		fills: Array.isArray(fills) ? fills.flatMap(fillOf) : [],
		texts: Array.isArray(texts) ? texts.filter((text): text is string => colorIn(text) !== null) : [],
	};
}

function fillOf(raw: unknown): ReadFill[] {
	if (!isObject(raw)) return [];
	const { color } = raw;
	if (typeof color !== "string" || colorOf(color) === null) return [];
	return [{ kind: raw["kind"] ?? raw["role"], color }];
}

function round(value: number): number {
	return Math.round(value * 10) / 10;
}

function stepBetween(one: Rgba, other: Rgba): number {
	return Math.abs(lightnessOf(one) - lightnessOf(other));
}

interface Shortfall {
	readonly onSurface: number;
	readonly floor: number;
}

function textShortfall(ink: Rgba, surface: Rgba, page: Rgba): Shortfall | null {
	const onSurface = contrastOf(over(ink, surface), surface);
	const onPage = contrastOf(over(ink, page), page);
	const floor = onPage >= TEXT_CONTRAST ? TEXT_CONTRAST : onPage * FAINT_TEXT_KEEPS;
	return onSurface < floor ? { onSurface, floor } : null;
}
