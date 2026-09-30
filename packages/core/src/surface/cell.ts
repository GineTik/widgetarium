import { memo } from "react";
import { isObject } from "../engine/is-object.js";
import { TreeCell } from "./tree-cell.js";
import type { DrawnCell, TreeCellProps } from "./tree-cell.js";

const CELL_SHAPE: readonly string[] = [
	"grow",
	"basis",
	"basisPx",
	"width",
	"preferredWidth",
	"preferredHeight",
	"keepsRatio",
	"id",
	"surface",
	"side",
	"dividerAxis",
	"dividerBefore",
	"dividerAfter",
	"dividerHalf",
	"gapAfter",
	"corner",
	"level",
	"plates",
	"underSurface",
];
const CELL_PROPS = ["standInPx", "editing", "settingsStandInPx", "tile", "definition", "shared"] as const;

export const Cell = memo(TreeCell, isSameCell);

function isSameCell(before: TreeCellProps, after: TreeCellProps): boolean {
	return (
		String(before.cell.path) === String(after.cell.path) &&
		CELL_SHAPE.every((key) => fieldOf(before.cell, key) === fieldOf(after.cell, key)) &&
		CELL_PROPS.every((key) => before[key] === after[key])
	);
}

function fieldOf(cell: DrawnCell, key: string): unknown {
	return isObject(cell) ? cell[key] : undefined;
}
