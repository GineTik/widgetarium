import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@widgetarium/kit";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { rowText } from "./spec-rows.js";

export interface ChoiceRowProps {
	readonly choice: AppSpec["choices"][number];
	readonly onPick: (picked: string) => void;
}

export function ChoiceRow({ choice, onPick }: ChoiceRowProps): ReactElement {
	return h("div", { className: "wg-ai-spec-row" }, [rowText(choice.name, null), choicePicker({ choice, onPick })]);
}

function choicePicker({ choice, onPick }: ChoiceRowProps): ReactElement {
	const items = choice.options.map((option) => h(SelectItem, { key: option, value: option }, option));
	const onValueChange = (picked: unknown): void => onPick(String(picked));
	return h(Select, { key: "pick", value: choice.picked, onValueChange }, [
		h(SelectTrigger, { key: "trigger", size: "s" }, h(SelectValue, {})),
		h(SelectContent, { key: "content" }, items),
	]);
}
