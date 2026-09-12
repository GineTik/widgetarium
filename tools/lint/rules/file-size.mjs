import { findingOnLine } from "../finding.mjs";
import { LIMITS, severityFor } from "../limits.mjs";

export const id = "file-size";

export function check(source) {
	const count = source.lines.length;
	const severity = severityFor(count, LIMITS.fileLines);
	if (!severity) return [];
	const limit = LIMITS.fileLines[severity];
	const message = `file is ${count} lines, limit is ${limit}; split it into files that each hold one thing`;
	return [findingOnLine(id, severity, limit + 1, message)];
}
