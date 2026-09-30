import { spanToPixels } from "../paths.js";
import { CHROME, clampPan, dialogBox, freeArea, openingPan, openingScale } from "../settings-fit.js";
import type { ChromeLayout, DialogFrame, OpeningScale, Point, Size } from "../settings-fit.js";
import type { ViewportSize } from "./use-viewport.js";
import type { LookView } from "./use-settings-look.js";

export interface GeometryManifest {
	readonly id?: string | undefined;
	readonly title?: string | undefined;
	readonly collapseBelowPx?: unknown;
}

export interface Place {
	readonly w: number;
	readonly h: number;
}

export interface GeometryOptions {
	readonly definition?: { readonly manifest?: GeometryManifest | null | undefined } | null | undefined;
	readonly canvasBox?: Size | null | undefined;
	readonly place: Place;
	readonly cell: number;
	readonly gap: number;
	readonly phone: boolean;
}

export interface WindowGeometry {
	readonly manifest: GeometryManifest;
	readonly frame: DialogFrame;
	readonly windowBox: Size;
	readonly canNarrow: boolean;
	readonly showingChip: boolean;
	readonly canvas: Size;
	readonly opening: OpeningScale;
	readonly scale: number;
	readonly live: boolean;
	readonly at: Point;
}

export function windowGeometry(options: GeometryOptions, view: LookView, viewport: ViewportSize): WindowGeometry {
	const { canvasBox, place, cell, gap, phone } = options;
	const { zoom, pan, folded, narrow } = view;
	const manifest = options.definition?.manifest ?? {};
	const frame = dialogBox(viewport, phone);
	const windowBox = { width: frame.width, height: frame.height };
	const free = freeArea(windowBox, chromeOf(folded, phone));
	const wanted = canvasBox ?? { width: spanToPixels(place.w, cell, gap), height: spanToPixels(place.h, cell, gap) };
	const narrowPx = narrowWidthOf(manifest);
	const showingChip = narrowPx !== null && narrow;
	const canvas = narrowPx !== null && narrow ? { width: narrowPx, height: wanted.height } : wanted;
	const opening = openingScale(canvas, free, CHROME.smallestLegibleScale);
	const scale = zoom ?? opening.scale;
	const at = clampPan(pan ?? openingPan(canvas, free, opening), canvas, scale, free, cell);
	const canNarrow = narrowPx !== null;
	return { manifest, frame, windowBox, canNarrow, showingChip, canvas, opening, scale, live: scale === 1, at };
}

function chromeOf(folded: boolean, phone: boolean): ChromeLayout {
	return {
		...CHROME,
		sheet: phone,
		panelWidthPx: folded ? CHROME.foldedPanelPx : CHROME.panelWidthPx,
		sheetPeekPx: folded ? CHROME.foldedPanelPx : CHROME.sheetPeekPx,
	};
}

function narrowWidthOf(manifest: GeometryManifest): number | null {
	return typeof manifest.collapseBelowPx === "number" ? manifest.collapseBelowPx - 1 : null;
}
