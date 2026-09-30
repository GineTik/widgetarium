import { createContext } from "react";
import type { Context } from "react";
import { APART, COLUMN, GROUP, NO_SURFACE, ROW, SIDES, SURFACES } from "../constants/surfaces";
import type { AcrossName, SideName, SurfaceName } from "../constants/surfaces";
import { isOneOf } from "./is-one-of";
import { isPainted, notASurface, platesWithin, surfaceRefusal, surfaceSaidNow } from "./plate-laws";
import type { PlateLevel, PlateRefusal } from "./plate-laws";
import type { StyleProp, TokenStyle } from "./token-style";

export { GROUP, NO_SURFACE };

export interface WordChoice<W> {
	readonly kind: string;
	readonly allowed: readonly W[];
	readonly fallback: W;
}

export interface PlatesAbove extends PlateLevel {
	readonly ownPlates: number;
}

export interface LaidCell {
	readonly underSurface?: SurfaceName | undefined;
	readonly plates?: number | undefined;
}

export type WornPlate =
	| { readonly surface: SurfaceName; readonly refusal: null }
	| { readonly surface: typeof NO_SURFACE; readonly refusal: PlateRefusal };

export interface PlateAsk {
	readonly surface: SurfaceName;
	readonly side?: unknown;
	readonly across?: unknown;
	readonly style?: StyleProp | undefined;
}

export interface PlateAttrs {
	readonly "data-surface"?: SurfaceName;
	readonly "data-side"?: SideName;
	readonly "data-across"?: AcrossName;
}

export interface PlateProps extends PlateAttrs {
	readonly style: TokenStyle;
}

const SIDE_WORD: WordChoice<SideName> = { kind: "side", allowed: SIDES, fallback: "end" };
const ACROSS_WORD: WordChoice<AcrossName> = { kind: "direction", allowed: [ROW, COLUMN], fallback: COLUMN };
const saidAlready = new Set<string>();

export function warnOnce(line: string): void {
	if (saidAlready.has(line)) return;
	saidAlready.add(line);
	console.warn(`Widgetarium: ${line}`);
}

export const PLATES_ABOVE: Context<PlatesAbove> = createContext<PlatesAbove>({
	surface: NO_SURFACE,
	levels: 0,
	ownPlates: 0,
});

export function platesAtCell(cell: LaidCell): PlatesAbove {
	return { surface: cell.underSurface ?? NO_SURFACE, levels: cell.plates ?? 0, ownPlates: 0 };
}

export function wornPlate(above: PlateLevel, said: unknown): WornPlate {
	const surface = surfaceSaidNow(said);
	if (!isOneOf(SURFACES, surface)) return { surface: NO_SURFACE, refusal: notASurface(surface) };
	const refusal = surfaceRefusal(above, surface);
	return refusal ? { surface: NO_SURFACE, refusal } : { surface, refusal: null };
}

export function platesInside(above: PlatesAbove, surface: SurfaceName): PlatesAbove {
	const isPlate = isPainted({ surface });
	return {
		surface: isPlate ? surface : above.surface,
		levels: platesWithin(above, surface),
		ownPlates: above.ownPlates + (isPlate ? 1 : 0),
	};
}

export function plateProps(above: PlatesAbove, { surface, side, across, style }: PlateAsk): PlateProps {
	return { ...plateAttrs(surface, side, across), style: { ...plateStyle(above, surface), ...style } };
}

export function wornWord<W>(said: unknown, { kind, allowed, fallback }: WordChoice<W>): W {
	if (said === undefined || said === null) return fallback;
	if (isOneOf(allowed, said)) return said;
	warnOnce(`${String(said)} is no ${kind}, so ${String(fallback)} was drawn instead: ${allowed.join(", ")}`);
	return fallback;
}

function plateAttrs(surface: SurfaceName, side: unknown, across: unknown): PlateAttrs {
	if (surface === NO_SURFACE) return {};
	if (surface !== APART) return { "data-surface": surface };
	return {
		"data-surface": APART,
		"data-side": wornWord(side, SIDE_WORD),
		"data-across": wornWord(across, ACROSS_WORD),
	};
}

function plateStyle(above: PlatesAbove, surface: SurfaceName): TokenStyle | null {
	if (!isPainted({ surface })) return null;
	return { "--wg-surface-corner": above.ownPlates === 0 ? "var(--wg-kit-plate)" : "var(--wg-kit-item)" };
}
