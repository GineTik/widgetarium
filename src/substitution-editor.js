import { createElement as h } from "react";
import { Segmented } from "./kit.js";
import { ruleError } from "./substitution.js";
import { RuleHead } from "./substitution-head.js";
import { Step } from "./substitution-step.js";
import { RuleSentence } from "./substitution-sentence.js";
import { RuleExample } from "./substitution-example.js";

const MODES = [
	{ value: "line", label: "Line" },
	{ value: "wrapped", label: "Wrapped" },
	{ value: "regex", label: "Regex" },
];

const STEPS = [
	{ name: "How it matches", hint: "One line, a block between two markers, or an expression" },
	{ name: "The rule", hint: "The trigger you write, and the widget that stands in for it" },
	{ name: "The result", hint: "Write a line here and see what the note draws" },
];

export function RuleEditor({ editing, registry, host, onPickWidget }) {
	const rule = editing.rule;
	const error = ruleError(rule);
	const chosen = registry.get(rule.widget);

	return h("section", { className: "wg-sub-editor" }, [
		h(RuleHead, { key: "head", editing, error }),
		h("div", { key: "steps", className: "wg-sub-steps" }, [
			h(
				Step,
				{ key: "match", index: 1, ...STEPS[0] },
				h(Segmented, {
					className: "wg-sub-tabs",
					items: MODES,
					value: rule.mode,
					onChange: (mode) => editing.patch({ mode }),
				}),
			),
			h(
				Step,
				{ key: "rule", index: 2, ...STEPS[1] },
				h(RuleSentence, { rule, patch: editing.patch, chosen, onPickWidget, error }),
			),
			h(
				Step,
				{ key: "result", index: 3, ...STEPS[2] },
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
