import { ruleBlock } from "./substitution.js";
import { sampleFromPattern } from "./regex-sample.js";

const BLOCKED = {
	error: { tone: "error", say: "Not valid" },
	draft: { tone: "warning", say: "Draft" },
	off: { tone: "neutral", say: "Off" },
};
const RUNNING = { tone: "success", say: "Live" };

const FALLBACK_SAMPLE = "call Olena before Friday";
const WRAPPED_SAMPLE = ["Check before release:", "access rights, error log."];
const UNMATCHED_SAMPLE = "a line that does not match";

export const MATCH_WORDS = {
	line: { opens: "When a line starts with", draws: "draw it with" },
	wrapped: { opens: "When a block opens with", closes: "and closes with", draws: "draw what is between with" },
	regex: { opens: "When a line matches", draws: "draw it with" },
};

export function ruleStatus(rule) {
	return BLOCKED[ruleBlock(rule)] ?? RUNNING;
}

export function triggerLabel(rule) {
	if (rule.mode === "regex") return "regex";
	if (rule.mode === "wrapped") return `${rule.open} … ${rule.close}`;
	return rule.open;
}

export function defaultSample(rule, definition) {
	const written = definition?.manifest?.preview?.content ?? FALLBACK_SAMPLE;
	if (rule.mode === "line") return `${rule.open} ${written.split("\n")[0]}`;
	if (rule.mode === "wrapped") return [rule.open, ...WRAPPED_SAMPLE, rule.close || rule.open].join("\n");
	const first = sampleFromPattern(rule.pattern, 0);
	return first ? [first, UNMATCHED_SAMPLE].join("\n") : "";
}
