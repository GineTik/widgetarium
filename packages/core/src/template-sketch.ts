import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { templateSketch } from "./templates.js";
import type { Template } from "./templates.js";
import { RegionSketch } from "./template-sketch-region.js";

export type NameOf = (widget: string | null) => ReactNode;

export interface SketchProps {
	readonly template: Template;
	readonly nameOf: NameOf;
}

export function Sketch({ template, nameOf }: SketchProps): ReactElement {
	return h(
		"div",
		{ className: "wg-tpl-sketch" },
		templateSketch(template).map((region) => h(RegionSketch, { key: region.name, region, nameOf })),
	);
}
