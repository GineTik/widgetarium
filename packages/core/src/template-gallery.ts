import { createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { Template } from "./templates.js";
import type { NameOf } from "./template-sketch.js";
import type { OnUseTemplate } from "./use-template-build.js";
import { TemplateCard } from "./template-card.js";

export type { NameOf } from "./template-sketch.js";
export type { OnUseTemplate, TemplateAnswer } from "./use-template-build.js";

export interface TemplateGridProps {
	readonly templates: readonly Template[];
	readonly columns: number;
	readonly nameOf: NameOf;
	readonly onUse: OnUseTemplate | null | undefined;
}

type ColumnsStyle = CSSProperties & { readonly "--wg-cat-columns": number };

export function TemplateGrid({ templates, columns, nameOf, onUse }: TemplateGridProps): ReactElement {
	const style: ColumnsStyle = { "--wg-cat-columns": columns };
	return h(
		"div",
		{ className: "wg-tpl-grid", style },
		templates.map((template) => h(TemplateCard, { key: template.id, template, nameOf, onUse })),
	);
}
