import { createElement as h } from "react";
import { Button, Icon } from "./kit.js";

const LEAD = "A substitution turns a line of text into a widget";
const NEW_RULE = "New substitution";

export function EmptyRules({ onAdd }) {
	return h("section", { className: "wg-sub-editor is-empty" }, [
		h("span", { key: "mark", className: "wg-sub-empty-mark" }, h(Icon, { name: "widget", size: 26 })),
		h("p", { key: "why", className: "wg-sub-empty-lead" }, LEAD),
		h(Button, { key: "new", variant: "accent", size: "l", onClick: onAdd }, NEW_RULE),
	]);
}
