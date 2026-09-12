const CAN_PAINT = process.stdout.isTTY === true;

const STYLES = { error: "[31m", warn: "[33m", dim: "[90m", bold: "[1m", off: "[0m" };

export function printReport(reports, options) {
	const shown = options.errorsOnly ? withErrorsOnly(reports) : reports;
	if (!options.summaryOnly) {
		for (const report of shown) printFileReport(report);
	}
	printTotals(reports);
}

function withErrorsOnly(reports) {
	return reports
		.map((report) => ({ ...report, findings: report.findings.filter((finding) => finding.severity === "error") }))
		.filter((report) => report.findings.length > 0);
}

function printFileReport(report) {
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

function byPlace(left, right) {
	if (left.line !== right.line) return left.line - right.line;
	return left.column - right.column;
}

function printTotals(reports) {
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

function countByRule(findings) {
	const byRule = new Map();
	for (const finding of findings) {
		const row = byRule.get(finding.rule) ?? { error: 0, warn: 0 };
		row[finding.severity] += 1;
		byRule.set(finding.rule, row);
	}
	return byRule;
}

function paint(text, tone) {
	if (!CAN_PAINT || !STYLES[tone]) return text;
	return `${STYLES[tone]}${text}${STYLES.off}`;
}
