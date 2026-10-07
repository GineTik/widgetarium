import { MESSAGE_ID_ATTRIBUTE, SCROLL_ANCHOR_ATTRIBUTE } from "../constants/message-scroller";

export interface ScrollableEdges {
	readonly start: boolean;
	readonly end: boolean;
}

export interface KeptRow {
	readonly id: string;
	readonly offset: number;
}

export function endTopOf(viewport: HTMLElement): number {
	return Math.max(0, viewport.scrollHeight - viewport.clientHeight);
}

export function distanceToEnd(viewport: HTMLElement): number {
	return endTopOf(viewport) - viewport.scrollTop;
}

export function edgesOf(viewport: HTMLElement, threshold: number): ScrollableEdges {
	return { start: viewport.scrollTop > threshold, end: distanceToEnd(viewport) > threshold };
}

export function topInScroll(viewport: HTMLElement, element: Element): number {
	return element.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
}

export function rowsIn(content: HTMLElement): HTMLElement[] {
	return Array.from(content.querySelectorAll<HTMLElement>(`[${MESSAGE_ID_ATTRIBUTE}]`));
}

export function anchorsIn(content: HTMLElement): HTMLElement[] {
	return Array.from(content.querySelectorAll<HTMLElement>(`[${MESSAGE_ID_ATTRIBUTE}][${SCROLL_ANCHOR_ATTRIBUTE}]`));
}

export function messageIdOf(element: Element): string {
	return element.getAttribute(MESSAGE_ID_ATTRIBUTE) ?? "";
}

export function rowById(content: HTMLElement, id: string): HTMLElement | null {
	return rowsIn(content).find((row) => messageIdOf(row) === id) ?? null;
}

export function keptRowOf(viewport: HTMLElement, content: HTMLElement): KeptRow | null {
	const rows = rowsIn(content);
	const edge = viewport.getBoundingClientRect().top;
	const row = rows[firstEndingBelow(rows, edge)];
	if (!row) return null;
	return { id: messageIdOf(row), offset: row.getBoundingClientRect().top - edge };
}

export function shiftOfKept(viewport: HTMLElement, content: HTMLElement, kept: KeptRow): number {
	const row = rowById(content, kept.id);
	if (!row) return 0;
	return row.getBoundingClientRect().top - viewport.getBoundingClientRect().top - kept.offset;
}

export function currentAnchorIdOf(viewport: HTMLElement, content: HTMLElement, peek: number): string | null {
	const anchors = anchorsIn(content);
	const edge = viewport.getBoundingClientRect().top + peek;
	const above = lastStartingAtOrAbove(anchors, edge);
	const anchor = anchors[above] ?? anchors[0];
	return anchor ? messageIdOf(anchor) : null;
}

export function roomUnder(anchor: HTMLElement, content: HTMLElement, viewport: HTMLElement, peek: number): number {
	const anchorInContent = anchor.getBoundingClientRect().top - content.getBoundingClientRect().top;
	return Math.max(0, anchorInContent - peek + viewport.clientHeight);
}

export function fitsBelow(anchor: HTMLElement, viewport: HTMLElement): boolean {
	return viewport.scrollHeight - topInScroll(viewport, anchor) <= viewport.clientHeight;
}

function firstEndingBelow(rows: readonly Element[], edge: number): number {
	let low = 0;
	let high = rows.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		const row = rows[middle];
		if (row && row.getBoundingClientRect().bottom > edge) high = middle;
		else low = middle + 1;
	}
	return low;
}

function lastStartingAtOrAbove(rows: readonly Element[], edge: number): number {
	let low = 0;
	let high = rows.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		const row = rows[middle];
		if (row && row.getBoundingClientRect().top <= edge) low = middle + 1;
		else high = middle;
	}
	return low - 1;
}
