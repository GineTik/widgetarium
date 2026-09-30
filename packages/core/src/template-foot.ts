import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CreateButton } from "./template-create-button.js";
import type { CreateButtonProps } from "./template-create-button.js";

export type TemplateFootProps = CreateButtonProps;

export function TemplateFoot({ template, isBusy, press }: TemplateFootProps): ReactElement {
	return h("div", { className: "wg-tpl-foot" }, [
		h("span", { className: "wg-tpl-name", key: "name" }, template.title),
		h(CreateButton, { key: "go", template, isBusy, press }),
	]);
}
