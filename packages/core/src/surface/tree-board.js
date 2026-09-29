import { createElement as h } from "react";
import { GAP_PX, gapVarsOf, REGION_GAP_PX } from "../tree.js";
import { ghostElement } from "./ghost.js";
import { foldedAside, regionOverlay, standingColumns } from "./region-chrome.js";
import { useTreeChrome } from "./use-tree-chrome.js";
import { useTreePage } from "./use-tree-page.js";

export function TreeBoard(props) {
	const page = useTreePage(props);
	const chrome = useTreeChrome(props, page);
	return h(
		"div",
		{
			className: "wg-tree-page",
			ref: page.pageRef,
			style: { "--wg-tree-gap": `${GAP_PX}px`, ...gapVarsOf(1) },
		},
		chrome.beside.length > 0
			? h(
					"div",
					{ className: "wg-tree-columns", style: { "--wg-tree-edge-gap": `${REGION_GAP_PX}px` } },
					standingColumns(chrome.beside, chrome),
				)
			: null,
		chrome.alone.map((at) => chrome.region(at, props.width)),
		chrome.floating.map((at) => regionOverlay(at, chrome)),
		chrome.hidden.map((at) => foldedAside(at, chrome)),
		ghostElement(page.carry, chrome.manifestOf(page.carry?.id)?.title ?? page.carry?.id, page.ghostRef),
	);
}
