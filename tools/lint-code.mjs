import { LINTED_ROOTS } from "./lint/limits.mjs";
import { findingOnLine } from "./lint/finding.mjs";
import { collectFiles, readSource } from "./lint/source.mjs";
import { printReport } from "./lint/report.mjs";
import * as fileSize from "./lint/rules/file-size.mjs";
import * as comments from "./lint/rules/comments.mjs";
import * as abstractionOrder from "./lint/rules/abstraction-order.mjs";
import * as functionSize from "./lint/rules/function-size.mjs";
import * as componentBody from "./lint/rules/component-body.mjs";
import * as earlyReturn from "./lint/rules/early-return.mjs";
import * as onePerFile from "./lint/rules/one-per-file.mjs";
import * as typing from "./lint/rules/typing.mjs";
import * as propsWidth from "./lint/rules/props-width.mjs";

const RULES = [
	fileSize,
	comments,
	abstractionOrder,
	functionSize,
	componentBody,
	earlyReturn,
	onePerFile,
	typing,
	propsWidth,
];

const cwd = process.cwd();
const options = readOptions(process.argv.slice(2));
const reports = collectFiles(options.roots, cwd).map((path) => inspect(path, options));

printReport(reports, options);
process.exit(reports.some((report) => report.findings.some((finding) => finding.severity === "error")) ? 1 : 0);

function readOptions(argv) {
	const flags = argv.filter((argument) => argument.startsWith("--"));
	const roots = argv.filter((argument) => !argument.startsWith("--"));
	const named = flags.find((flag) => flag.startsWith("--rule="))?.slice("--rule=".length) ?? "";
	return {
		roots: roots.length > 0 ? roots : LINTED_ROOTS,
		summaryOnly: flags.includes("--summary"),
		errorsOnly: flags.includes("--errors"),
		onlyRules: named ? named.split(",") : [],
	};
}

function inspect(path, options) {
	const source = readSource(path, cwd);
	if (source.failure) return { path, findings: [toParseFailureFinding(source)] };
	const wanted = RULES.filter((rule) => options.onlyRules.length === 0 || options.onlyRules.includes(rule.id));
	return { path, findings: wanted.flatMap((rule) => rule.check(source)) };
}

function toParseFailureFinding(source) {
	return findingOnLine("parse", "error", 1, `not parsed: ${source.failure}`);
}
