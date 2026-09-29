import { memo } from "react";
import { TreeCell } from "./tree-cell.js";

const CELL_SHAPE = [
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
const CELL_PROPS = ["standInPx", "editing", "settingsStandInPx", "tile", "definition", "shared"];

export const Cell = memo(TreeCell, isSameCell);

function isSameCell(before, after) {
	return (
		String(before.cell.path) === String(after.cell.path) &&
		CELL_SHAPE.every((key) => before.cell[key] === after.cell[key]) &&
		CELL_PROPS.every((key) => before[key] === after[key])
	);
}
