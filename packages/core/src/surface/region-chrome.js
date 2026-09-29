import { createElement as h } from "react";
import { HIDE, openKeyOf, overlayWidthOf, regionCollapseOf, sideOf, sidebarWidth } from "../tree.js";
import { CollapsedPanel, lookOf } from "./collapsed-panel.js";

export function standingColumns(beside, chrome) {
	return beside.flatMap((column, index) => [
		edgeBetween(beside[index - 1], column, chrome),
		chrome.region(column.at, column.width),
	]);
}

export function foldedAside(at, chrome) {
	return h(
		"div",
		{ className: "wg-tree-fold", key: `folded-${at}`, "aria-hidden": "true" },
		chrome.region(at, sidebarWidth(chrome.root, at)),
	);
}

export function regionOverlay(at, chrome) {
	const into = regionCollapseOf(chrome.drawn, at);
	if (into === HIDE) return foldedAside(at, chrome);
	const look = lookOf(into, sideOf(chrome.drawn, at));
	const width = overlayWidthOf(into, window.innerWidth);
	return h(
		CollapsedPanel,
		{
			key: `drawer-${at}`,
			openKey: openKeyOf(chrome.drawn.of[at], [at]),
			look,
			width,
			shared: chrome.shared,
			pressAt: chrome.pressAt,
		},
		chrome.region(at, width, true),
	);
}

function edgeBetween(before, column, chrome) {
	if (!before) return null;
	if (before.at !== chrome.keep) return edgeGrip(before.at, 1, chrome);
	if (column.at !== chrome.keep) return edgeGrip(column.at, -1, chrome);
	return null;
}

function edgeGrip(at, toward, chrome) {
	return h(
		"div",
		{ className: "wg-tree-handle is-across is-edge", key: `edge-${at}`, onPointerDown: chrome.grabSidebar(at, toward) },
		h("i", { className: "wg-tree-grip" }),
	);
}
