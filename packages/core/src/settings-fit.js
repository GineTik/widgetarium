import { GRID } from "./paths.js";

// THE WINDOW IS A DIALOG, so its room is the SCREEN, not the board. Laid out inside the board
// it grew the board to fit itself, which pushed the note's own scrollbar in and let a stray
// wheel scroll the note out from under a window that was supposed to hold the screen.
export const DIALOG = {
	insetPx: 24,
	phoneInsetPx: 8,
	minWidthPx: 320,
	minHeightPx: 360,
};

// TRADE-OFF: derived from the viewport, not measured off the element — a measured box is zero
// on the first frame, and the window then opens at a scale it immediately has to correct
export function dialogBox(viewport, phone) {
	const inset = phone ? DIALOG.phoneInsetPx : DIALOG.insetPx;
	return {
		width: Math.max(DIALOG.minWidthPx, (viewport?.width ?? 0) - inset * 2),
		height: Math.max(DIALOG.minHeightPx, (viewport?.height ?? 0) - inset * 2),
		inset,
	};
}

// CONTEXT: the window's chrome, in the pixels the design drew it at
export const CHROME = {
	padPx: 16,
	gapPx: 12,
	headerHeightPx: 46,
	panelWidthPx: 288,
	foldedPanelPx: 38,
	barHeightPx: 36,
	sheetPeekPx: 168,
	// CONTEXT: 12px type at 0.7 renders at 8.4px, below which a preview answers nothing
	floorScale: 0.7,
	sheet: false,
};

// WHERE THE CONTROLS STAND WHILE THE SHEET MOVES. They sit one gap above it and leave the moment
// there is no room left between the sheet and the header — measured against the sheet's REAL
// height, because a second place holding the resting height is what let the sheet grow into them.
export function barPlacement(chrome, sheetHeightPx, frameHeightPx) {
	const bottomPx = chrome.padPx + sheetHeightPx + chrome.gapPx;
	const ceilingPx = frameHeightPx - chrome.padPx - chrome.headerHeightPx;
	return { bottomPx, hidden: bottomPx + chrome.barHeightPx + chrome.gapPx > ceilingPx };
}

// TRADE-OFF: one cell on every side, not one in total — flush against glass reads as tucked under
function marginPx() {
	return GRID.cellPx;
}

export function freeArea(box, chrome) {
	const margin = marginPx();
	const sidebar = chrome.sheet ? 0 : chrome.panelWidthPx + chrome.gapPx;
	const sheet = chrome.sheet ? chrome.sheetPeekPx + chrome.gapPx : 0;
	const left = chrome.padPx + margin;
	const top = chrome.padPx + chrome.headerHeightPx + chrome.gapPx + margin;
	const right = box.width - chrome.padPx - sidebar - margin;
	const bottom = box.height - chrome.padPx - chrome.barHeightPx - chrome.gapPx - sheet - margin;
	return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export function openingScale(widget, free, floorScale) {
	if (!(widget.width > 0) || !(widget.height > 0)) return { fit: 1, scale: 1, panned: false };
	const fit = Math.min(1, free.width / widget.width, free.height / widget.height);
	const scale = Math.max(fit, floorScale);
	return { fit, scale, panned: scale > fit };
}

// CONTEXT: below the floor the window stops zooming out and starts panned instead
export function openingPan(widget, free, opening) {
	if (opening.panned) return { x: free.left, y: free.top };
	return {
		x: free.left + (free.width - widget.width * opening.scale) / 2,
		y: free.top + (free.height - widget.height * opening.scale) / 2,
	};
}

// TRADE-OFF: clamped against the free area, not the window — glass hides, an edge does not
export function clampPan(point, widget, scale, free, cellPx) {
	const width = widget.width * scale;
	const height = widget.height * scale;
	const keepWide = Math.min(cellPx, width);
	const keepTall = Math.min(cellPx, height);
	return {
		x: clamp(point.x, free.left + keepWide - width, free.right - keepWide),
		y: clamp(point.y, free.top + keepTall - height, free.bottom - keepTall),
	};
}

function clamp(value, low, high) {
	return Math.max(low, Math.min(value, Math.max(low, high)));
}
