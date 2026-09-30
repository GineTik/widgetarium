import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { HIDE, openKeyOf, overlayWidthOf, regionCollapseOf, sideOf, sidebarWidth } from "../tree.js";
import type { StandingColumn } from "../tree-columns.js";
import { CollapsedPanel, lookOf } from "./collapsed-panel.js";
import type { PressAtKey } from "./collapsed-panel.js";
import type { LaidTree } from "./lay-tree.js";
import type { GrabSidebar, Toward } from "./sidebar-drag.js";
import type { SurfaceShared } from "./use-surface-shared.js";

export type DrawRegion = (at: number, width: number, isFloating?: boolean) => ReactNode;

export interface RegionChrome extends Pick<LaidTree, "root" | "drawn" | "keep"> {
	readonly region: DrawRegion;
	readonly shared: Pick<SurfaceShared, "cellFor">;
	readonly pressAt: PressAtKey;
	readonly grabSidebar: GrabSidebar;
}

export function standingColumns(beside: readonly StandingColumn[], chrome: RegionChrome): ReactNode[] {
	return beside.flatMap((column, index) => [
		edgeBetween(beside[index - 1], column, chrome),
		chrome.region(column.at, column.width),
	]);
}

export function foldedAside(at: number, chrome: RegionChrome): ReactElement {
	return h(
		"div",
		{ className: "wg-tree-fold", key: `folded-${at}`, "aria-hidden": "true" },
		chrome.region(at, sidebarWidth(chrome.root, at)),
	);
}

export function regionOverlay(at: number, chrome: RegionChrome): ReactElement | null {
	const into = regionCollapseOf(chrome.drawn, at);
	if (into === HIDE) return foldedAside(at, chrome);
	const node = chrome.drawn.of[at];
	if (!node) return null;
	const look = lookOf(into, sideOf(chrome.drawn, at));
	const width = overlayWidthOf(into, window.innerWidth);
	return h(
		CollapsedPanel,
		{
			key: `drawer-${at}`,
			openKey: openKeyOf(node, [at]),
			look,
			width,
			shared: chrome.shared,
			pressAt: chrome.pressAt,
		},
		chrome.region(at, width, true),
	);
}

function edgeBetween(
	before: StandingColumn | undefined,
	column: StandingColumn,
	chrome: RegionChrome,
): ReactElement | null {
	if (!before) return null;
	if (before.at !== chrome.keep) return edgeGrip(before.at, 1, chrome);
	if (column.at !== chrome.keep) return edgeGrip(column.at, -1, chrome);
	return null;
}

function edgeGrip(at: number, toward: Toward, chrome: RegionChrome): ReactElement {
	return h(
		"div",
		{ className: "wg-tree-handle is-across is-edge", key: `edge-${at}`, onPointerDown: chrome.grabSidebar(at, toward) },
		h("i", { className: "wg-tree-grip" }),
	);
}
