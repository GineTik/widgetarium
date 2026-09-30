import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Card, Field, Pill, Switch } from "@widgetarium/kit";
import type { Rule } from "./substitution.js";
import { ruleStatus } from "./substitution-say.js";
import type { RuleEditing } from "./use-rule-editing.js";

export interface RuleHeadProps {
	readonly editing: RuleEditing;
	readonly rule: Rule;
	readonly error: string | null;
}

const NAME = "Name";
const ENABLED = "Enabled";
const DELETE = "Delete";
const SAVE = "Save";

export function RuleHead({ editing, rule, error }: RuleHeadProps): ReactElement {
	const status = ruleStatus(rule);
	const savable = rule.draft && !error;

	return h("header", { className: "wg-sub-head" }, [
		h("div", { key: "ident", className: "wg-sub-ident" }, [
			h(Field, {
				key: "name",
				value: rule.name,
				placeholder: NAME,
				className: "wg-sub-name",
				onValueChange: (name: string) => editing.patch({ name }),
			}),
			h(Pill, { key: "state", tone: status.tone, className: "wg-sub-state" }, status.say),
		]),
		h("div", { key: "acts", className: "wg-sub-acts" }, [
			h(Card, { key: "on", className: "wg-sub-power" }, [
				h("span", { key: "word", className: "wg-sub-power-word" }, ENABLED),
				h(Switch, {
					key: "switch",
					checked: rule.enabled,
					label: ENABLED,
					onChange: (next: boolean) => editing.patch({ enabled: next }),
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
