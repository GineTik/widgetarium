import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SketchRegion } from "./templates.js";
import type { NameOf } from "./template-sketch.js";
import { RowSketch } from "./template-sketch-row.js";

export interface RegionSketchProps {
	readonly region: SketchRegion;
	readonly nameOf: NameOf;
}

export function RegionSketch({ region, nameOf }: RegionSketchProps): ReactElement {
	return h(
		"div",
		{ className: `wg-tpl-region is-${region.name}` },
		region.rows.map((row, at) => h(RowSketch, { key: at, row, nameOf })),
	);
}
