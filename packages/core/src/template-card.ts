import { createElement as h } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactElement } from "react";
import { cardClass, cn } from "@widgetarium/kit";
import type { Template } from "./templates.js";
import { Sketch } from "./template-sketch.js";
import type { NameOf } from "./template-sketch.js";
import { TemplateFoot } from "./template-foot.js";
import { TemplateNote } from "./template-note.js";
import { createLabelFor } from "./template-create-button.js";
import { useTemplateBuild } from "./use-template-build.js";
import type { OnUseTemplate } from "./use-template-build.js";

export interface TemplateCardProps {
	readonly template: Template;
	readonly nameOf: NameOf;
	readonly onUse: OnUseTemplate | null | undefined;
}

export function TemplateCard({ template, nameOf, onUse }: TemplateCardProps): ReactElement {
	const { step, isBusy, failure, press } = useTemplateBuild(template, onUse);
	return h("article", { ...cardHandle(template, press), className: cn(cardClass({}), "wg-tpl-tile") }, [
		h("div", { className: "wg-tpl-stage", key: "stage" }, h(Sketch, { template, nameOf })),
		h(TemplateFoot, { key: "foot", template, isBusy, press }),
		h("p", { className: "wg-tpl-what", key: "what" }, template.description),
		h(TemplateNote, { key: "note", isBusy, step, failure }),
	]);
}

function cardHandle(template: Template, press: () => unknown): HTMLAttributes<HTMLElement> {
	const onKeyDown = (event: KeyboardEvent): unknown => (event.key === "Enter" || event.key === " ") && press();
	return { role: "button", tabIndex: 0, "aria-label": createLabelFor(template), onClick: press, onKeyDown };
}
