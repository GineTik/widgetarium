import { createElement as h } from "react";
import type { ReactElement } from "react";
import { EditableTabs } from "../editable-tabs.js";
import { applyTabStep, archivedOf, movesRows, movesSelection, tabsOf } from "../tab-rows.js";
import type { TabStep } from "../tab-rows.js";
import { refOf } from "../gateway/refs.js";
import { holdsOf, pathKey, shownIn, SWAP } from "../tree.js";
import type { LaidBox, Placement } from "../tree-laid.js";
import { styleOfNode, surfaceAttrs } from "./node-style.js";
import { nodeElement } from "./tree-nodes.js";
import type { TreeDraw } from "./tree-nodes.js";
import { useCellValue } from "./use-cell-value.js";
import { usePublishesSwap } from "./use-publishes-swap.js";
import type { SwapRefs } from "./use-publishes-swap.js";

const VIEW_GONE_FOR_GOOD =
	"The view goes for good, with the widgets in it and everything they were set to. This cannot be undone.";

type LaidSwap = LaidBox & Placement;

export interface SwapBoxProps {
	readonly swap: LaidSwap;
	readonly draw: TreeDraw;
}

export function SwapBox({ swap, draw }: SwapBoxProps): ReactElement {
	const rows = holdsOf(swap);
	const named = swapRefs(swap);
	const cell = draw.shared.cellFor(named.selection);
	const picked = useCellValue(cell);
	const shown = shownIn(rows, typeof picked === "string" ? picked : null);
	const shownAt = rows.findIndex((row) => row.name === shown);
	usePublishesSwap(swap, { refs: draw.shared.refs, cell, named, rows });

	const apply = (step: TabStep): void => {
		if (movesSelection(step)) void cell.update(step.selected);
		if (movesRows(step)) draw.commitHolds(swap.path, applyTabStep(rows, step));
	};

	const key = pathKey(swap.path);
	return h(
		"div",
		{ className: "wg-tree-swap", "data-path": key, "data-dir": SWAP, style: styleOfNode(swap), ...surfaceAttrs(swap) },
		swap.strip
			? h(EditableTabs, {
					key: "strip",
					className: "wg-tree-swap-strip",
					tabs: tabsOf(rows),
					archived: archivedOf(rows),
					selected: shown ?? "",
					onChange: apply,
					deleteWarning: VIEW_GONE_FOR_GOOD,
					isEditable: draw.editing,
				})
			: null,
		swap.of.map((child, at) =>
			h(
				"div",
				{ className: "wg-tree-swap-held", key: pathKey(child.path), hidden: at !== shownAt },
				nodeElement(child, draw),
			),
		),
	);
}

// TRADE-OFF: a box with no id publishes nothing and keeps its pick under its path, because binding to a place rather than to an identity is what a moved box would silently break
function swapRefs(swap: LaidSwap): SwapRefs {
	if (!swap.id) return { holds: null, selection: `swap:${pathKey(swap.path)}/selection` };
	return { holds: refOf(swap.id, "holds"), selection: refOf(swap.id, "selection") };
}
