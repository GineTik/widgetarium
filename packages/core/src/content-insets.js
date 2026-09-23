import { useLayoutEffect } from "react";
import { isClear } from "./color-math.js";

const SETTLE_MS = 150;
const MAX_NODES_PER_TILE = 3000;
const STILL_PX = 2;
const SIDES = ["top", "right", "bottom", "left"];
const MEDIA = new Set(["IMG", "SVG", "CANVAS", "VIDEO"]);

// TRADE-OFF: read off the drawn widget after every settled change, because what stands between a widget's edge and its first content is its author's styling, which no manifest declares
export function useContentInsets(pageRef, setInsets) {
	useLayoutEffect(() => {
		const page = pageRef.current;
		if (!page) return undefined;
		let timer = 0;
		const measure = () => setInsets((held) => settledInsets(held, insetsOnPage(page)));
		const schedule = () => {
			window.clearTimeout(timer);
			timer = window.setTimeout(measure, SETTLE_MS);
		};
		const mutations = new MutationObserver(schedule);
		mutations.observe(page, { childList: true, subtree: true, characterData: true });
		const sizes = new ResizeObserver(schedule);
		sizes.observe(page);
		measure();
		return () => {
			window.clearTimeout(timer);
			mutations.disconnect();
			sizes.disconnect();
		};
	}, []);
}

export function contentInsetsOf(body) {
	const frame = body.getBoundingClientRect();
	if (frame.width === 0 || frame.height === 0) return null;
	const rects = contentRectsIn(body);
	if (rects.length === 0) return null;
	const nearest = (read) => Math.max(0, Math.round(Math.min(...rects.map(read))));
	return {
		top: nearest((rect) => rect.top - frame.top),
		right: nearest((rect) => frame.right - rect.right),
		bottom: nearest((rect) => frame.bottom - rect.bottom),
		left: nearest((rect) => rect.left - frame.left),
	};
}

function insetsOnPage(page) {
	return Object.fromEntries(
		[...page.querySelectorAll(".wg-tree-cell[data-cell] > .wg-tile-body")]
			.map((body) => [body.parentElement.dataset.cell, contentInsetsOf(body)])
			.filter(([, insets]) => insets),
	);
}

function settledInsets(held, measured) {
	const ids = new Set([...Object.keys(held), ...Object.keys(measured)]);
	const isStill = [...ids].every(
		(id) => held[id] && measured[id] && SIDES.every((side) => Math.abs(held[id][side] - measured[id][side]) < STILL_PX),
	);
	return isStill ? held : measured;
}

function contentRectsIn(body) {
	const rects = [];
	const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(), seen = 0; node && seen < MAX_NODES_PER_TILE; node = walker.nextNode(), seen += 1) {
		const rect = node.nodeType === Node.TEXT_NODE ? textRectOf(node) : paintedRectOf(node);
		if (rect) rects.push(rect);
	}
	return rects;
}

function textRectOf(node) {
	if (node.textContent.trim() === "" || !node.parentElement) return null;
	if (getComputedStyle(node.parentElement).visibility === "hidden") return null;
	const range = document.createRange();
	range.selectNodeContents(node);
	return visibleRect(range.getBoundingClientRect());
}

function paintedRectOf(element) {
	const style = getComputedStyle(element);
	if (style.visibility === "hidden" || style.opacity === "0") return null;
	return isDrawn(element, style) ? visibleRect(element.getBoundingClientRect()) : null;
}

function isDrawn(element, style) {
	if (MEDIA.has(element.tagName.toUpperCase())) return true;
	if (style.backgroundImage !== "none" || !isClear(style.backgroundColor) || hasBorder(style)) return true;
	const before = getComputedStyle(element, "::before");
	return before.content !== "none" && (!isClear(before.backgroundColor) || hasBorder(before));
}

function hasBorder(style) {
	return SIDES.some(
		(side) =>
			parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
			!isClear(style.getPropertyValue(`border-${side}-color`)),
	);
}

function visibleRect(rect) {
	return rect.width > 0 && rect.height > 0 ? rect : null;
}
