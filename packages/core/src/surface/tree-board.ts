import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GAP_PX, gapVarsOf, REGION_GAP_PX } from "../tree.js";
import type { Board } from "../model.js";
import type { BoardEdits, CommitLayout } from "./board-edits.js";
import { ghostElement } from "./ghost.js";
import type { NodeStyle } from "./node-style.js";
import { foldedAside, regionOverlay, standingColumns } from "./region-chrome.js";
import type { TreeDraw } from "./tree-nodes.js";
import type { OnActions } from "./use-header-actions.js";
import { useTreeChrome } from "./use-tree-chrome.js";
import type { TreeChrome } from "./use-tree-chrome.js";
import { useTreePage } from "./use-tree-page.js";
import type { TreePage } from "./use-tree-page.js";

export interface TreeBoardProps extends Omit<TreeDraw, "tileOf" | "pressAt" | "carry"> {
	readonly board: Board;
	readonly width: number;
	readonly commitLayout: CommitLayout;
	readonly addTileAt: BoardEdits["addTileAt"];
	readonly onActions: OnActions | null | undefined;
}

export function TreeBoard(props: TreeBoardProps): ReactElement {
	const page = useTreePage(props);
	const chrome = useTreeChrome(props, page);
	const pageStyle: NodeStyle = { "--wg-tree-gap": `${GAP_PX}px`, ...gapVarsOf(1) };
	const columnsStyle: NodeStyle = { "--wg-tree-edge-gap": `${REGION_GAP_PX}px` };
	return h(
		"div",
		{ className: "wg-tree-page", ref: page.pageRef, style: pageStyle },
		chrome.beside.length > 0
			? h("div", { className: "wg-tree-columns", style: columnsStyle }, standingColumns(chrome.beside, chrome))
			: null,
		chrome.alone.map((at) => chrome.region(at, props.width)),
		chrome.floating.map((at) => regionOverlay(at, chrome)),
		chrome.hidden.map((at) => foldedAside(at, chrome)),
		ghostElement(page.carry, carriedName(chrome, page), page.ghostRef),
	);
}

function carriedName(chrome: Pick<TreeChrome, "manifestOf">, page: Pick<TreePage, "carry">): string | undefined {
	const title = chrome.manifestOf(page.carry?.id)?.["title"];
	return typeof title === "string" ? title : page.carry?.id;
}
