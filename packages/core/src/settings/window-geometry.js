import { spanToPixels } from "../paths.js";
import { CHROME, clampPan, dialogBox, freeArea, openingPan, openingScale } from "../settings-fit.js";

export function windowGeometry(options, view, viewport) {
	const { definition, canvasBox, place, cell, gap, phone } = options;
	const { zoom, pan, folded, narrow } = view;
	const manifest = definition?.manifest ?? {};
	const frame = dialogBox(viewport, phone);
	const windowBox = { width: frame.width, height: frame.height };
	const layout = {
		...CHROME,
		sheet: phone,
		panelWidthPx: folded ? CHROME.foldedPanelPx : CHROME.panelWidthPx,
		sheetPeekPx: folded ? CHROME.foldedPanelPx : CHROME.sheetPeekPx,
	};
	const free = freeArea(windowBox, layout);
	const wanted = canvasBox ?? { width: spanToPixels(place.w, cell, gap), height: spanToPixels(place.h, cell, gap) };
	const canNarrow = typeof manifest.collapseBelowPx === "number";
	const showingChip = canNarrow && narrow;
	const canvas = showingChip ? { width: manifest.collapseBelowPx - 1, height: wanted.height } : wanted;
	const opening = openingScale(canvas, free, CHROME.floorScale);
	const scale = zoom ?? opening.scale;
	const live = scale === 1;
	const at = clampPan(pan ?? openingPan(canvas, free, opening), canvas, scale, free, cell);
	return { manifest, frame, windowBox, canNarrow, showingChip, canvas, opening, scale, live, at };
}
