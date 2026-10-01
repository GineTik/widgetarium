import type { Finding } from "./finding.mts";

export interface FileReport {
	readonly path: string;
	readonly findings: readonly Finding[];
}

export interface ReportAsk {
	readonly summaryOnly: boolean;
	readonly errorsOnly: boolean;
}

type Tone = "error" | "warn" | "dim" | "bold";

interface RuleCount {
	error: number;
	warn: number;
}

const CAN_PAINT = process.stdout.isTTY === true;

const TONE_CODES: Readonly<Record<Tone, string>> = {
	error: "\u001b[31m",
	warn: "\u001b[33m",
	dim: "\u001b[90m",
	bold: "\u001b[1m",
};
const TONE_OFF = "\u001b[0m";

export function printReport(reports: readonly FileReport[], ask: ReportAsk): void {
	const shown = ask.errorsOnly ? withErrorsOnly(reports) : reports;
	if (!ask.summaryOnly) {
		for (const report of shown) printFileReport(report);
	}
	printTotals(reports);
}

function withErrorsOnly(reports: readonly FileReport[]): FileReport[] {
	return reports
		.map((report) => ({ ...report, findings: report.findings.filter((finding) => finding.severity === "error") }))
		.filter((report) => report.findings.length > 0);
}

function printFileReport(report: FileReport): void {
	if (report.findings.length === 0) return;
	process.stdout.write(`\n${paint(report.path, "bold")}\n`);
	for (const finding of [...report.findings].sort(byPlace)) {
		const place = `${finding.line}:${finding.column}`.padEnd(9);
		const severityLabel = paint(finding.severity.padEnd(5), finding.severity);
		process.stdout.write(
			`  ${paint(place, "dim")} ${severityLabel} ${paint(finding.rule.padEnd(18), "dim")} ${finding.message}\n`,
		);
	}
}

function byPlace(left: Finding, right: Finding): number {
	if (left.line !== right.line) return left.line - right.line;
	return left.column - right.column;
}

function printTotals(reports: readonly FileReport[]): void {
	const findings = reports.flatMap((report) => report.findings);
	const byRule = countByRule(findings);
	process.stdout.write(`\n${paint("rule                   errors  warnings", "bold")}\n`);
	for (const [rule, row] of [...byRule.entries()].sort((left, right) => right[1].error - left[1].error)) {
		process.stdout.write(`${rule.padEnd(20)} ${String(row.error).padStart(6)}  ${String(row.warn).padStart(8)}\n`);
	}
	const errors = findings.filter((finding) => finding.severity === "error").length;
	const warnings = findings.length - errors;
	const dirtyFilesCount = reports.filter((report) => report.findings.length > 0).length;
	const verdict = `${paint(`${errors} errors`, errors > 0 ? "error" : "dim")}, ${paint(`${warnings} warnings`, "warn")}`;
	process.stdout.write(`\n${verdict} in ${dirtyFilesCount} of ${reports.length} files\n`);
}

function countByRule(findings: readonly Finding[]): Map<string, RuleCount> {
	const byRule = new Map<string, RuleCount>();
	for (const finding of findings) {
		const row = byRule.get(finding.rule) ?? { error: 0, warn: 0 };
		row[finding.severity] += 1;
		byRule.set(finding.rule, row);
	}
	return byRule;
}

function paint(text: string, tone: Tone): string {
	if (!CAN_PAINT) return text;
	return `${TONE_CODES[tone]}${text}${TONE_OFF}`;
}
