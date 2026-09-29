import { createElement as h } from "react";
import { pathKey } from "../tree.js";
import { styleOfNode, surfaceAttrs } from "./node-style.js";
import { tileActions } from "./tile-actions.js";
import { treeCellBody } from "./tree-cell-body.js";

export function TreeCell(props) {
	const { cell, tile, definition, shared, patchTile, standInPx, editing, settingsStandInPx, onOpenSettings, onRemove } =
		props;
	const style = styleOfNode(cell);
	const at = {
		"data-cell": cell.id,
		...(cell.path ? { "data-path": pathKey(cell.path) } : {}),
		...(cell.across ? { "data-stands-across": cell.across } : {}),
	};
	if (standInPx)
		return h("div", {
			className: "wg-tree-cell is-stand-in",
			style: { ...style, minHeight: `${standInPx}px` },
			...at,
		});
	const shownInCell = settingsStandInPx
		? h("div", { style: { minHeight: `${settingsStandInPx}px` } })
		: treeCellBody({ tile, definition, shared, cell, patchTile, editing, onOpenSettings });
	return h("div", { className: "wg-tile wg-tree-cell", style, ...at, ...surfaceAttrs(cell) }, [
		h("div", { className: "wg-tile-body", key: "body" }, shownInCell),
		editing && !settingsStandInPx ? tileActions(tile.id, onOpenSettings, onRemove) : null,
	]);
}
