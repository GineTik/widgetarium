import { createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import { pathKey } from "../tree.js";
import type { LaidLeaf, Placement } from "../tree-laid.js";
import type { Tile } from "../model.js";
import type { WidgetDefinition } from "../registry.js";
import type { PatchTile } from "./board-edits.js";
import { styleOfNode, surfaceAttrs } from "./node-style.js";
import { tileActions } from "./tile-actions.js";
import { treeCellBody } from "./tree-cell-body.js";
import type { SettingsSession } from "./use-settings-session.js";
import type { SurfaceShared } from "./use-surface-shared.js";

const UNLAID_CELL_STYLE: CSSProperties = { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 };

type LaidCell = LaidLeaf & Placement;

interface UnlaidCell {
	readonly id: string;
	readonly path: null;
	readonly width: number;
	readonly height: null;
}

export type DrawnCell = LaidCell | UnlaidCell;

export interface TreeCellProps {
	readonly cell: DrawnCell;
	readonly tile: Tile;
	readonly definition: WidgetDefinition | null | undefined;
	readonly shared: SurfaceShared;
	readonly patchTile: PatchTile;
	readonly standInPx?: number | undefined;
	readonly editing?: boolean | undefined;
	readonly settingsStandInPx?: number | undefined;
	readonly onOpenSettings?: SettingsSession["open"] | undefined;
	readonly onRemove?: ((id: string) => void) | undefined;
}

export function TreeCell(props: TreeCellProps): ReactElement {
	const { cell, tile, definition, shared, patchTile, standInPx, editing, settingsStandInPx, onOpenSettings, onRemove } =
		props;
	const style = cell.path === null ? UNLAID_CELL_STYLE : styleOfNode(cell);
	const at = {
		"data-cell": cell.id,
		...(cell.path ? { "data-path": pathKey(cell.path) } : {}),
		...(cell.path && cell.across ? { "data-stands-across": cell.across } : {}),
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
	return h("div", { className: "wg-tile wg-tree-cell", style, ...at, ...(cell.path ? surfaceAttrs(cell) : {}) }, [
		h("div", { className: "wg-tile-body", key: "body" }, shownInCell),
		editing && !settingsStandInPx ? tileActions(tile.id, onOpenSettings, onRemove) : null,
	]);
}
