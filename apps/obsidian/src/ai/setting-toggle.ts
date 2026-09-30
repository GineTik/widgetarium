import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Switch } from "@widgetarium/kit";

export interface SettingToggleProps {
	readonly checked: boolean;
	readonly onChange: (on: boolean) => void;
	readonly label: string;
	readonly hint: string;
}

export function SettingToggle({ checked, onChange, label, hint }: SettingToggleProps): ReactElement {
	return h("div", { className: "wg-ai-choice" }, [
		h("div", { className: "wg-ai-choice-head", key: "head" }, [
			h(Switch, { key: "switch", checked, onChange, label }),
			h("span", { className: "wg-ai-choice-label", key: "label" }, label),
		]),
		h("p", { className: "wg-ai-choice-hint", key: "hint" }, hint),
	]);
}
