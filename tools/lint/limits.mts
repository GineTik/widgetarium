import type { Severity } from "./finding.mts";

export interface Limit {
	readonly warn: number;
	readonly error: number;
}

export const LIMITS = {
	fileLines: { warn: 250, error: 400 },
	functionLines: { warn: 50, error: 80 },
	componentLocalDeclarations: { warn: 10, error: 15 },
	componentsPerFile: { error: 1 },
	hooksPerFile: { warn: 1 },
	propsWidth: { warn: 6, error: 12 },
} as const;

export const LINTED_ROOTS: readonly string[] = [
	"apps/obsidian/src",
	"packages/core/src",
	"packages/kit/src",
	"packages/sdk/types",
	"registry",
];

export const SKIPPED_PATHS: readonly string[] = [
	"packages/kit/src/emojis/emoji-table.ts",
	"packages/kit/src/icons/icon-table.ts",
	"apps/obsidian/src/regex-sample.ts",
];

export const ALLOWED_COMMENT_PREFIXES: readonly string[] = ["TODO:", "TRADE-OFF:"];

export const DIRECTIVE_PREFIXES: readonly string[] = [
	"@ts-",
	"eslint",
	"prettier-ignore",
	"ignore:",
	"noqa",
	"global ",
	"c8 ",
	"istanbul ",
	"#!",
	"/ <reference",
];

export function severityFor(value: number, limit: Limit): Severity | null {
	if (value > limit.error) return "error";
	if (value > limit.warn) return "warn";
	return null;
}
