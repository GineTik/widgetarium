export const LIMITS = {
	fileLines: { warn: 250, error: 400 },
	functionLines: { warn: 50, error: 80 },
	componentLocalDeclarations: { warn: 10, error: 15 },
	componentsPerFile: { error: 1 },
	hooksPerFile: { warn: 1 },
	propsWidth: { warn: 6, error: 12 },
};

export const LINTED_ROOTS = ["src", "widgets"];

export const SKIPPED_PATHS = ["src/emoji-table.js", "src/icon-table.js", "src/regex-sample.js"];

export const ALLOWED_COMMENT_PREFIXES = ["TODO:", "TRADE-OFF:"];

export const DIRECTIVE_PREFIXES = [
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

export function severityFor(value, limit) {
	if (value > limit.error) return "error";
	if (value > limit.warn) return "warn";
	return null;
}
