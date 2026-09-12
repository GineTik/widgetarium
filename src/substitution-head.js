import { createElement as h } from "react";
import { Button, Card, Field, Pill, Switch } from "./kit.js";
import { ruleStatus } from "./substitution-say.js";

const NAME = "Name";
const ENABLED = "Enabled";
const DELETE = "Delete";
const SAVE = "Save";

export function RuleHead({ editing, error }) {
	const rule = editing.rule;
	const status = ruleStatus(rule);
	const savable = rule.draft && !error;

	return h("header", { className: "wg-sub-head" }, [
		h("div", { key: "ident", className: "wg-sub-ident" }, [
			h(Field, {
				key: "name",
				value: rule.name,
				placeholder: NAME,
				className: "wg-sub-name",
				onInput: (event) => editing.patch({ name: event.target.value }),
			}),
			h(Pill, { key: "state", tone: status.tone, className: "wg-sub-state" }, status.say),
		]),
		h("div", { key: "acts", className: "wg-sub-acts" }, [
			h(Card, { key: "on", variant: "solid", className: "wg-sub-power" }, [
				h("span", { key: "word", className: "wg-sub-power-word" }, ENABLED),
				h(Switch, {
					key: "switch",
					checked: rule.enabled,
					label: ENABLED,
					onChange: (next) => editing.patch({ enabled: next }),
				}),
			]),
			h(Button, { key: "del", className: "wg-sub-delete", onClick: editing.drop }, DELETE),
			h(
				Button,
				{
					key: "save",
					variant: savable ? "accent" : "neutral",
					className: "wg-sub-save",
					disabled: !savable,
					onClick: editing.publish,
				},
				SAVE,
			),
		]),
	]);
}
