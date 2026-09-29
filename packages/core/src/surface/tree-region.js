import { createElement as h, useRef } from "react";
import { GAP_PX } from "../tree.js";
import { nodeElement } from "./tree-nodes.js";
import { TreeCell } from "./tree-cell.js";
import { useSettlesCells } from "./use-settles-cells.js";

export function TreeRegion({ node, insets, onCarry, overlay, ...draw }) {
	const rootRef = useRef(null);
	useSettlesCells(rootRef, insets);

	return h(
		"div",
		{
			className: "wg-tree-region-body",
			ref: rootRef,
			onPointerDown: onCarry,
			style: { "--wg-tree-gap": `${GAP_PX}px` },
		},
		overlay.map((tile) => overlayElement(tile, draw)),
		nodeElement(node, draw),
	);
}

function overlayElement(tile, draw) {
	return h(
		"div",
		{ className: "wg-tree-overlay", key: tile.id },
		h(TreeCell, {
			cell: { id: tile.id, path: null, width: 0, height: null },
			tile,
			definition: draw.shared.registry.get(tile.widget),
			shared: draw.shared,
			patchTile: draw.patchTile,
		}),
	);
}
