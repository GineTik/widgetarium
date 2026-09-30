import { isObject } from "@widgetarium/core/engine/is-object.js";
import { ruleBlock } from "./substitution.js";
import type { Rule, RuleBlock, RuleMode } from "./substitution.js";
import { sampleFromPattern } from "./regex-sample.js";

export interface RuleStatus {
	readonly tone: "error" | "warning" | "neutral" | "success";
	readonly say: string;
}

export interface MatchWords {
	readonly opens: string;
	readonly closes?: string;
	readonly draws: string;
}

interface PreviewedDefinition {
	readonly manifest?: unknown;
}

const BLOCKED: Readonly<Record<RuleBlock, RuleStatus>> = {
	error: { tone: "error", say: "Not valid" },
	draft: { tone: "warning", say: "Draft" },
	off: { tone: "neutral", say: "Off" },
};
const RUNNING: RuleStatus = { tone: "success", say: "Live" };

const FALLBACK_SAMPLE = "call Olena before Friday";
const WRAPPED_SAMPLE = ["Check before release:", "access rights, error log."];
const UNMATCHED_SAMPLE = "a line that does not match";

export const MATCH_WORDS: Readonly<Record<RuleMode, MatchWords>> = {
	line: { opens: "When a line starts with", draws: "draw it with" },
	wrapped: { opens: "When a block opens with", closes: "and closes with", draws: "draw what is between with" },
	regex: { opens: "When a line matches", draws: "draw it with" },
};

export function ruleStatus(rule: Rule): RuleStatus {
	const blocked = ruleBlock(rule);
	return blocked ? BLOCKED[blocked] : RUNNING;
}

export function triggerLabel(rule: Rule): string {
	if (rule.mode === "regex") return "regex";
	if (rule.mode === "wrapped") return `${rule.open} … ${rule.close}`;
	return rule.open;
}

export function defaultSample(rule: Rule, definition: PreviewedDefinition | null | undefined): string {
	const written = previewContentOf(definition) ?? FALLBACK_SAMPLE;
	if (rule.mode === "line") return `${rule.open} ${written.split("\n")[0] ?? ""}`;
	if (rule.mode === "wrapped") return [rule.open, ...WRAPPED_SAMPLE, rule.close || rule.open].join("\n");
	const first = sampleFromPattern(rule.pattern, 0);
	return first ? [first, UNMATCHED_SAMPLE].join("\n") : "";
}

function previewContentOf(definition: PreviewedDefinition | null | undefined): string | undefined {
	const manifest = definition?.manifest;
	const preview = isObject(manifest) ? manifest["preview"] : undefined;
	const content = isObject(preview) ? preview["content"] : undefined;
	return content === undefined || content === null ? undefined : String(content);
}
