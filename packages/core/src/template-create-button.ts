import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { Template } from "./templates.js";

export interface CreateButtonProps {
	readonly template: Template;
	readonly isBusy: boolean;
	readonly press: () => unknown;
}

const CREATE_LABEL = "Create a page from {template}";

export function CreateButton({ template, isBusy, press }: CreateButtonProps): ReactElement {
	const take = (event: MouseEvent): void => {
		event.stopPropagation();
		press();
	};
	return h(
		IconButton,
		{
			className: "wg-cat-go",
			variant: "accent",
			size: "s",
			label: createLabelFor(template),
			disabled: isBusy,
			onClick: take,
		},
		h(Icon, { name: "plus", size: 15 }),
	);
}

export function createLabelFor(template: Template): string {
	return CREATE_LABEL.replace("{template}", template.title);
}
