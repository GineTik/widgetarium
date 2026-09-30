import { GRID } from "./paths.js";

export interface Size {
	readonly width: number;
	readonly height: number;
}

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface DialogFrame extends Size {
	readonly inset: number;
}

export interface ChromeLayout {
	readonly padPx: number;
	readonly gapPx: number;
	readonly headerHeightPx: number;
	readonly panelWidthPx: number;
	readonly foldedPanelPx: number;
	readonly barHeightPx: number;
	readonly sheetPeekPx: number;
	readonly floorScale: number;
	readonly sheet: boolean;
}

export interface BarPlacement {
	readonly bottomPx: number;
	readonly hidden: boolean;
}

export interface FreeArea extends Size {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

export interface OpeningScale {
	readonly fit: number;
	readonly scale: number;
	readonly panned: boolean;
}

export const DIALOG = {
	insetPx: 24,
	phoneInsetPx: 8,
	minWidthPx: 320,
	minHeightPx: 360,
};

export const CHROME: ChromeLayout = {
	padPx: 16,
	gapPx: 12,
	headerHeightPx: 46,
	panelWidthPx: 288,
	foldedPanelPx: 38,
	barHeightPx: 36,
	sheetPeekPx: 168,
	// TRADE-OFF: 12px type at 0.7 renders at 8.4px; lower, a preview answers nothing.
	floorScale: 0.7,
	sheet: false,
};

// TRADE-OFF: derived from the viewport, not measured — a measured box is zero on the first frame.
export function dialogBox(viewport: Size | null | undefined, phone: boolean): DialogFrame {
	const inset = phone ? DIALOG.phoneInsetPx : DIALOG.insetPx;
	return {
		width: Math.max(DIALOG.minWidthPx, (viewport?.width ?? 0) - inset * 2),
		height: Math.max(DIALOG.minHeightPx, (viewport?.height ?? 0) - inset * 2),
		inset,
	};
}

export function barPlacement(chrome: ChromeLayout, sheetHeightPx: number, frameHeightPx: number): BarPlacement {
	const bottomPx = chrome.padPx + sheetHeightPx + chrome.gapPx;
	const ceilingPx = frameHeightPx - chrome.padPx - chrome.headerHeightPx;
	return { bottomPx, hidden: bottomPx + chrome.barHeightPx + chrome.gapPx > ceilingPx };
}

export function freeArea(box: Size, chrome: ChromeLayout): FreeArea {
	const margin = marginPx();
	const sidebar = chrome.sheet ? 0 : chrome.panelWidthPx + chrome.gapPx;
	const sheet = chrome.sheet ? chrome.sheetPeekPx + chrome.gapPx : 0;
	const left = chrome.padPx + margin;
	const top = chrome.padPx + chrome.headerHeightPx + chrome.gapPx + margin;
	const right = box.width - chrome.padPx - sidebar - margin;
	const bottom = box.height - chrome.padPx - chrome.barHeightPx - chrome.gapPx - sheet - margin;
	return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export function openingScale(widget: Size, free: Size, floorScale: number): OpeningScale {
	if (!(widget.width > 0) || !(widget.height > 0)) return { fit: 1, scale: 1, panned: false };
	const fit = Math.min(1, free.width / widget.width, free.height / widget.height);
	const scale = Math.max(fit, floorScale);
	return { fit, scale, panned: scale > fit };
}

export function openingPan(widget: Size, free: FreeArea, opening: OpeningScale): Point {
	if (opening.panned) return { x: free.left, y: free.top };
	return {
		x: free.left + (free.width - widget.width * opening.scale) / 2,
		y: free.top + (free.height - widget.height * opening.scale) / 2,
	};
}

// TRADE-OFF: clamped against the free area, not the window — glass hides, an edge does not
export function clampPan(point: Point, widget: Size, scale: number, free: FreeArea, cellPx: number): Point {
	const width = widget.width * scale;
	const height = widget.height * scale;
	const keepWide = Math.min(cellPx, width);
	const keepTall = Math.min(cellPx, height);
	return {
		x: clamp(point.x, free.left + keepWide - width, free.right - keepWide),
		y: clamp(point.y, free.top + keepTall - height, free.bottom - keepTall),
	};
}

// TRADE-OFF: one cell on every side, not one in total — flush against glass reads as tucked under
function marginPx(): number {
	return GRID.cellPx;
}

function clamp(value: number, low: number, high: number): number {
	return Math.max(low, Math.min(value, Math.max(low, high)));
}
