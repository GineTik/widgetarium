import { createElement as h } from "react";
import { EditableTabs } from "../editable-tabs.js";
import { applyTabStep, archivedOf, movesRows, movesSelection, tabsOf } from "../tab-rows.js";
import { refOf } from "../gateway/refs.js";
import { holdsOf, pathKey, shownIn, SWAP } from "../tree.js";
import { styleOfNode, surfaceAttrs } from "./node-style.js";
import { nodeElement } from "./tree-nodes.js";
import { useCellValue } from "./use-cell-value.js";
import { usePublishedSwap } from "./use-published-swap.js";

const VIEW_GONE_FOR_GOOD =
	"The view goes for good, with the widgets in it and everything they were set to. This cannot be undone.";

export function SwapBox({ swap, draw }) {
	const rows = holdsOf(swap);
	const named = swapRefs(swap);
	const cell = draw.shared.cellFor(named.selection);
	const shown = shownIn(rows, useCellValue(cell));
	const shownAt = rows.findIndex((row) => row.name === shown);
	usePublishedSwap(swap, { refs: draw.shared.refs, cell, named, rows });

	const apply = (step) => {
		if (movesSelection(step)) cell.update(step.selected ?? "");
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
function swapRefs(swap) {
	if (!swap.id) return { holds: null, selection: `swap:${pathKey(swap.path)}/selection` };
	return { holds: refOf(swap.id, "holds"), selection: refOf(swap.id, "selection") };
}
