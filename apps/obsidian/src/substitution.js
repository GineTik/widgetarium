export const MODES = ["line", "wrapped", "regex"];

const BLANK = { name: "", mode: "line", open: "", close: "", pattern: "", widget: "", enabled: true, draft: false };

export function normalizeRule(raw, at = 0) {
	const source = raw && typeof raw === "object" ? raw : {};
	const mode = MODES.includes(source.mode) ? source.mode : BLANK.mode;
	return {
		id: typeof source.id === "string" && source.id ? source.id : `sub-${at + 1}`,
		name: String(source.name ?? BLANK.name),
		mode,
		open: String(source.open ?? BLANK.open),
		close: String(source.close ?? BLANK.close),
		pattern: String(source.pattern ?? BLANK.pattern),
		widget: String(source.widget ?? BLANK.widget),
		enabled: source.enabled !== false,
		draft: source.draft === true,
	};
}

export function normalizeRules(raw) {
	if (!Array.isArray(raw)) return [];
	return raw.map((entry, at) => normalizeRule(entry, at));
}

export function nextRuleId(rules) {
	const used = new Set(rules.map((rule) => rule.id));
	let at = rules.length + 1;
	while (used.has(`sub-${at}`)) at += 1;
	return `sub-${at}`;
}

export function newRule(rules) {
	return normalizeRule({ ...BLANK, id: nextRuleId(rules), name: "Untitled", open: "!", draft: true });
}

export function compilePattern(pattern) {
	try {
		return new RegExp(pattern);
	} catch {
		return null;
	}
}

export function ruleError(rule) {
	if (!rule.widget) return "Pick a widget";
	if (rule.mode === "regex") {
		if (!rule.pattern) return "Write an expression";
		return compilePattern(rule.pattern) ? null : "That expression cannot be read";
	}
	if (!rule.open) return "Write a trigger";
	if (rule.mode === "wrapped" && !rule.close) return "Write a closing trigger";
	return null;
}

// CONTEXT: a rule with no widget or a broken expression must never silently swallow a line
export function ruleBlock(rule) {
	if (ruleError(rule)) return "error";
	if (rule.draft) return "draft";
	if (!rule.enabled) return "off";
	return null;
}

export function activeRules(rules) {
	return rules.filter((rule) => !ruleBlock(rule));
}

function matchAt(lines, at, rule) {
	const line = lines[at];
	if (rule.mode === "line") {
		if (!line.startsWith(rule.open)) return null;
		return { from: at, to: at, content: line.slice(rule.open.length).trimStart() };
	}
	if (rule.mode === "wrapped") {
		if (line.trim() !== rule.open) return null;
		for (let end = at + 1; end < lines.length; end += 1) {
			if (lines[end].trim() !== rule.close) continue;
			return { from: at, to: end, content: lines.slice(at + 1, end).join("\n") };
		}
		return null;
	}
	const expression = compilePattern(rule.pattern);
	const found = expression?.exec(line);
	if (!found) return null;
	return { from: at, to: at, content: found[1] ?? found[0] };
}

export function matchLines(lines, rules) {
	const usable = activeRules(rules);
	const spans = [];
	let at = 0;
	while (at < lines.length) {
		let taken = null;
		for (const rule of usable) {
			const span = matchAt(lines, at, rule);
			if (!span) continue;
			taken = { ...span, rule };
			break;
		}
		if (!taken) {
			at += 1;
			continue;
		}
		spans.push(taken);
		at = taken.to + 1;
	}
	return spans;
}

// CONTEXT: an edit can only be written back where the trigger can be put back on — a regular
// expression describes what matched, never how to spell it again
export function renderSpan(rule, content) {
	const lines = String(content ?? "").split("\n");
	if (rule.mode === "line") return [`${rule.open} ${lines.join(" ")}`];
	if (rule.mode === "wrapped") return [rule.open, ...lines, rule.close];
	return null;
}
