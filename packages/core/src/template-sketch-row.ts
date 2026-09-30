import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SketchCell } from "./templates.js";
import type { NameOf } from "./template-sketch.js";

export interface RowSketchProps {
	readonly row: readonly SketchCell[];
	readonly nameOf: NameOf;
}

export function RowSketch({ row, nameOf }: RowSketchProps): ReactElement {
	return h(
		"div",
		{ className: "wg-tpl-row" },
		row.map((cell) =>
			h("span", { key: cell.id, className: "wg-tpl-cell", style: { flexGrow: cell.ratio } }, nameOf(cell.widget)),
		),
	);
}
