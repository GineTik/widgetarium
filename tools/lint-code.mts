import { LINTED_ROOTS } from "./lint/limits.mts";
import { findingOnLine, type Finding } from "./lint/finding.mts";
import { collectFiles, readSource, type ParsedSource, type UnparsedSource } from "./lint/source.mts";
import { printReport, type FileReport, type ReportAsk } from "./lint/report.mts";
import * as fileSize from "./lint/rules/file-size.mts";
import * as comments from "./lint/rules/comments.mts";
import * as abstractionOrder from "./lint/rules/abstraction-order.mts";
import * as functionSize from "./lint/rules/function-size.mts";
import * as componentBody from "./lint/rules/component-body.mts";
import * as earlyReturn from "./lint/rules/early-return.mts";
import * as onePerFile from "./lint/rules/one-per-file.mts";
import * as typing from "./lint/rules/typing.mts";
import * as propsWidth from "./lint/rules/props-width.mts";
import * as doubleCast from "./lint/rules/double-cast.mts";

interface LintRule {
	readonly id: string;
	check(source: ParsedSource): Finding[];
}

interface LintAsk extends ReportAsk {
	readonly roots: readonly string[];
	readonly onlyRules: readonly string[];
}

const RULES: readonly LintRule[] = [
	fileSize,
	comments,
	abstractionOrder,
	functionSize,
	componentBody,
	earlyReturn,
	onePerFile,
	typing,
	propsWidth,
	doubleCast,
];

const cwd = process.cwd();
const ask = lintAskOf(process.argv.slice(2));
const reports = collectFiles(ask.roots, cwd).map((path) => inspect(path, ask));

printReport(reports, ask);
process.exit(reports.some((report) => report.findings.some((finding) => finding.severity === "error")) ? 1 : 0);

function lintAskOf(argv: readonly string[]): LintAsk {
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

function inspect(path: string, lintAsk: LintAsk): FileReport {
	const source = readSource(path, cwd);
	if (isUnparsed(source)) return { path, findings: [toParseFailureFinding(source)] };
	const wanted = RULES.filter((rule) => lintAsk.onlyRules.length === 0 || lintAsk.onlyRules.includes(rule.id));
	return { path, findings: wanted.flatMap((rule) => rule.check(source)) };
}

function isUnparsed(source: ParsedSource | UnparsedSource): source is UnparsedSource {
	return "failure" in source;
}

function toParseFailureFinding(source: UnparsedSource): Finding {
	return findingOnLine("parse", "error", 1, `not parsed: ${source.failure}`);
}
