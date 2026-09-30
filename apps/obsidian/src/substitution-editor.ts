import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { ViewHost } from "@widgetarium/core/gateway/host.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import { ruleError } from "./substitution.js";
import type { Rule, RuleMode } from "./substitution.js";
import { RuleHead } from "./substitution-head.js";
import { Step } from "./substitution-step.js";
import { RuleSentence } from "./substitution-sentence.js";
import { RuleExample } from "./substitution-example.js";
import type { RuleEditing } from "./use-rule-editing.js";

export interface RuleEditorProps {
	readonly editing: RuleEditing;
	readonly rule: Rule;
	readonly registry: WidgetLookup;
	readonly host: ViewHost | null | undefined;
	readonly onPickWidget: () => void;
}

const MODES: readonly { readonly value: RuleMode; readonly label: string }[] = [
	{ value: "line", label: "Line" },
	{ value: "wrapped", label: "Wrapped" },
	{ value: "regex", label: "Regex" },
];

const MATCHING = { name: "How it matches", hint: "One line, a block between two markers, or an expression" };
const RULING = { name: "The rule", hint: "The trigger you write, and the widget that stands in for it" };
const RESULTING = { name: "The result", hint: "Write a line here and see what the note draws" };

export function RuleEditor({ editing, rule, registry, host, onPickWidget }: RuleEditorProps): ReactElement {
	const error = ruleError(rule);
	const chosen = registry.get(rule.widget);

	return h("section", { className: "wg-sub-editor" }, [
		h(RuleHead, { key: "head", editing, rule, error }),
		h("div", { key: "steps", className: "wg-sub-steps" }, [
			h(
				Step,
				{ key: "match", index: 1, ...MATCHING },
				h(Segmented<RuleMode>, {
					className: "wg-sub-tabs",
					items: MODES,
					value: rule.mode,
					onChange: (mode: RuleMode) => editing.patch({ mode }),
				}),
			),
			h(
				Step,
				{ key: "rule", index: 2, ...RULING },
				h(RuleSentence, { rule, patch: editing.patch, chosen, onPickWidget, error }),
			),
			h(
				Step,
				{ key: "result", index: 3, ...RESULTING },
				h(RuleExample, {
					rule,
					registry,
					host,
					sample: editing.sampleOf(chosen),
					onSample: editing.onSample,
				}),
			),
		]),
	]);
}
