import { useState } from "react";
import { newRule } from "./substitution.js";
import { defaultSample } from "./substitution-say.js";

export function useRuleEditing(rules, onChange) {
	const [openId, setOpenId] = useState(rules[0]?.id ?? null);
	const [samples, setSamples] = useState({});
	const rule = rules.find((entry) => entry.id === openId) ?? rules[0] ?? null;
	const writtenOver = (next) => rules.map((entry) => (entry.id === rule.id ? { ...entry, ...next } : entry));

	return {
		rules,
		rule,
		open: setOpenId,
		patch: (next) => onChange(writtenOver({ ...next, draft: true })),
		publish: () => onChange(writtenOver({ draft: false })),
		drop: () => {
			const left = rules.filter((entry) => entry.id !== rule.id);
			setOpenId(left[0]?.id ?? null);
			onChange(left);
		},
		add: () => {
			const created = newRule(rules);
			setOpenId(created.id);
			onChange([...rules, created]);
		},
		sampleOf: (definition) => samples[rule.id] ?? defaultSample(rule, definition),
		onSample: (text) => setSamples({ ...samples, [rule.id]: text }),
	};
}
