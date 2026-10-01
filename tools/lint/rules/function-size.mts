import { functionsOf, lineSpanOf, type FunctionEntry } from "../ast.mts";
import { findingAt, type Finding } from "../finding.mts";
import { LIMITS, severityFor } from "../limits.mts";
import type { ParsedSource } from "../source.mts";

export const id = "function-size";

export function check(source: ParsedSource): Finding[] {
	const findings: Finding[] = [];
	for (const entry of functionsOf(source.ast)) {
		const lines = lineSpanOf(entry.node);
		const severity = severityFor(lines, LIMITS.functionLines);
		if (!severity) continue;
		const message = `${kindOf(entry)} ${labelOf(entry)} is ${lines} lines, limit is ${LIMITS.functionLines[severity]}; lift the parts into named functions of their own`;
		findings.push(findingAt(id, severity, entry.node, message));
	}
	return findings;
}

function kindOf(entry: FunctionEntry): string {
	if (entry.isComponent) return "component";
	if (entry.isHook) return "hook";
	return "function";
}

function labelOf(entry: FunctionEntry): string {
	return entry.name ? `"${entry.name}"` : "(anonymous)";
}
