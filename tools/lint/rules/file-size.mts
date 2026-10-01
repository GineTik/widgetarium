import { findingOnLine, type Finding } from "../finding.mts";
import { LIMITS, severityFor } from "../limits.mts";
import type { ParsedSource } from "../source.mts";

export const id = "file-size";

export function check(source: ParsedSource): Finding[] {
	const count = source.lines.length;
	const severity = severityFor(count, LIMITS.fileLines);
	if (!severity) return [];
	const limit = LIMITS.fileLines[severity];
	const message = `file is ${count} lines, limit is ${limit}; split it into files that each hold one thing`;
	return [findingOnLine(id, severity, limit + 1, message)];
}
