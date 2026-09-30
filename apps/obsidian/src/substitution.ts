import { isObject } from "@widgetarium/core/engine/is-object.js";

export const MODES = ["line", "wrapped", "regex"] as const;

export type RuleMode = (typeof MODES)[number];

export type RuleBlock = "error" | "draft" | "off";

export interface Rule {
	readonly id: string;
	readonly name: string;
	readonly mode: RuleMode;
	readonly open: string;
	readonly close: string;
	readonly pattern: string;
	readonly widget: string;
	readonly enabled: boolean;
	readonly draft: boolean;
}

export interface Span {
	readonly from: number;
	readonly to: number;
	readonly content: string;
}

export interface RuleSpan extends Span {
	readonly rule: Rule;
}

const BLANK = { name: "", mode: "line", open: "", close: "", pattern: "", widget: "", enabled: true, draft: false };

export function normalizeRule(raw: unknown, at = 0): Rule {
	const source = isObject(raw) ? raw : {};
	const { id, mode } = source;
	return {
		id: typeof id === "string" && id ? id : `sub-${at + 1}`,
		name: String(source["name"] ?? BLANK.name),
		mode: isMode(mode) ? mode : "line",
		open: String(source["open"] ?? BLANK.open),
		close: String(source["close"] ?? BLANK.close),
		pattern: String(source["pattern"] ?? BLANK.pattern),
		widget: String(source["widget"] ?? BLANK.widget),
		enabled: source["enabled"] !== false,
		draft: source["draft"] === true,
	};
}

export function normalizeRules(raw: unknown): Rule[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((entry: unknown, at) => normalizeRule(entry, at));
}

export function nextRuleId(rules: readonly Rule[]): string {
	const used = new Set(rules.map((rule) => rule.id));
	let at = rules.length + 1;
	while (used.has(`sub-${at}`)) at += 1;
	return `sub-${at}`;
}

export function newRule(rules: readonly Rule[]): Rule {
	return normalizeRule({ ...BLANK, id: nextRuleId(rules), name: "Untitled", open: "!", draft: true });
}

export function compilePattern(pattern: string): RegExp | null {
	try {
		return new RegExp(pattern);
	} catch {
		return null;
	}
}

export function ruleError(rule: Rule): string | null {
	if (!rule.widget) return "Pick a widget";
	if (rule.mode === "regex") {
		if (!rule.pattern) return "Write an expression";
		return compilePattern(rule.pattern) ? null : "That expression cannot be read";
	}
	if (!rule.open) return "Write a trigger";
	if (rule.mode === "wrapped" && !rule.close) return "Write a closing trigger";
	return null;
}

export function ruleBlock(rule: Rule): RuleBlock | null {
	if (ruleError(rule)) return "error";
	if (rule.draft) return "draft";
	if (!rule.enabled) return "off";
	return null;
}

export function activeRules(rules: readonly Rule[]): Rule[] {
	return rules.filter((rule) => !ruleBlock(rule));
}

export function matchLines(lines: readonly string[], rules: readonly Rule[]): RuleSpan[] {
	const usable = activeRules(rules);
	const spans: RuleSpan[] = [];
	let at = 0;
	while (at < lines.length) {
		const taken = firstSpanAt(lines, at, usable);
		if (!taken) {
			at += 1;
			continue;
		}
		spans.push(taken);
		at = taken.to + 1;
	}
	return spans;
}

export function renderSpan(rule: Rule, content: unknown): string[] | null {
	const lines = String(content ?? "").split("\n");
	if (rule.mode === "line") return [`${rule.open} ${lines.join(" ")}`];
	if (rule.mode === "wrapped") return [rule.open, ...lines, rule.close];
	return null;
}

function isMode(mode: unknown): mode is RuleMode {
	return MODES.some((known) => known === mode);
}

function firstSpanAt(lines: readonly string[], at: number, usable: readonly Rule[]): RuleSpan | null {
	for (const rule of usable) {
		const span = matchAt(lines, at, rule);
		if (span) return { ...span, rule };
	}
	return null;
}

function matchAt(lines: readonly string[], at: number, rule: Rule): Span | null {
	const line = lines[at] ?? "";
	if (rule.mode === "line") {
		if (!line.startsWith(rule.open)) return null;
		return { from: at, to: at, content: line.slice(rule.open.length).trimStart() };
	}
	if (rule.mode === "wrapped") return wrappedFrom(lines, at, rule);
	const expression = compilePattern(rule.pattern);
	const found = expression?.exec(line);
	if (!found) return null;
	return { from: at, to: at, content: found[1] ?? found[0] };
}

function wrappedFrom(lines: readonly string[], at: number, rule: Rule): Span | null {
	if ((lines[at] ?? "").trim() !== rule.open) return null;
	for (let end = at + 1; end < lines.length; end += 1) {
		if ((lines[end] ?? "").trim() !== rule.close) continue;
		return { from: at, to: end, content: lines.slice(at + 1, end).join("\n") };
	}
	return null;
}
