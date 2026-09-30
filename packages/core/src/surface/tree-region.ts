import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { GAP_PX } from "../tree.js";
import type { LaidNode } from "../tree-laid.js";
import type { InsetsByCell } from "../content-insets.js";
import type { Tile } from "../model.js";
import type { NodeStyle } from "./node-style.js";
import { nodeElement } from "./tree-nodes.js";
import type { TreeDraw } from "./tree-nodes.js";
import { TreeCell } from "./tree-cell.js";
import type { TreePage } from "./use-tree-page.js";
import { useSettlesCells } from "./use-settles-cells.js";

export interface TreeRegionProps extends TreeDraw {
	readonly node: LaidNode;
	readonly insets: InsetsByCell;
	readonly onCarry: TreePage["carryFrom"];
	readonly overlay: readonly Tile[];
}

export function TreeRegion({ node, insets, onCarry, overlay, ...draw }: TreeRegionProps): ReactElement {
	const rootRef = useRef<HTMLDivElement | null>(null);
	useSettlesCells(rootRef, insets);
	const style: NodeStyle = { "--wg-tree-gap": `${GAP_PX}px` };

	return h(
		"div",
		{
			className: "wg-tree-region-body",
			ref: rootRef,
			onPointerDown: onCarry,
			style,
		},
		overlay.map((tile) => overlayElement(tile, draw)),
		nodeElement(node, draw),
	);
}

function overlayElement(tile: Tile, draw: TreeDraw): ReactElement {
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
