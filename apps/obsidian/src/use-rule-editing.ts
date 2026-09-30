import { useState } from "react";
import { newRule } from "./substitution.js";
import type { Rule } from "./substitution.js";
import { defaultSample } from "./substitution-say.js";

export type RulePatch = Partial<Omit<Rule, "id">>;

export interface RuleEditing {
	readonly rules: readonly Rule[];
	readonly rule: Rule | null;
	open(id: string): void;
	patch(next: RulePatch): void;
	publish(): void;
	drop(): void;
	add(): void;
	sampleOf(definition: { readonly manifest?: unknown } | null | undefined): string;
	onSample(text: string): void;
}

export function useRuleEditing(rules: readonly Rule[], onChange: (next: Rule[]) => void): RuleEditing {
	const [openId, setOpenId] = useState<string | null>(rules[0]?.id ?? null);
	const [samples, setSamples] = useState<Readonly<Record<string, string>>>({});
	const rule = rules.find((entry) => entry.id === openId) ?? rules[0] ?? null;
	const writtenOver = (next: RulePatch): Rule[] =>
		rules.map((entry) => (entry.id === rule?.id ? { ...entry, ...next } : entry));

	return {
		rules,
		rule,
		open: setOpenId,
		patch: (next) => onChange(writtenOver({ ...next, draft: true })),
		publish: () => onChange(writtenOver({ draft: false })),
		drop: () => {
			const left = rules.filter((entry) => entry.id !== rule?.id);
			setOpenId(left[0]?.id ?? null);
			onChange(left);
		},
		add: () => {
			const created = newRule(rules);
			setOpenId(created.id);
			onChange([...rules, created]);
		},
		sampleOf: (definition) => (rule ? (samples[rule.id] ?? defaultSample(rule, definition)) : ""),
		onSample: (text) => {
			if (rule) setSamples({ ...samples, [rule.id]: text });
		},
	};
}
