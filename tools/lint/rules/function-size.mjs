import { functionsOf, lineSpanOf } from "../ast.mjs";
import { findingAt } from "../finding.mjs";
import { LIMITS, severityFor } from "../limits.mjs";

export const id = "function-size";

export function check(source) {
	const findings = [];
	for (const entry of functionsOf(source.ast)) {
		const lines = lineSpanOf(entry.node);
		const severity = severityFor(lines, LIMITS.functionLines);
		if (!severity) continue;
		const message = `${kindOf(entry)} ${labelOf(entry)} is ${lines} lines, limit is ${LIMITS.functionLines[severity]}; lift the parts into named functions of their own`;
		findings.push(findingAt(id, severity, entry.node, message));
	}
	return findings;
}

function kindOf(entry) {
	if (entry.isComponent) return "component";
	if (entry.isHook) return "hook";
	return "function";
}

function labelOf(entry) {
	return entry.name ? `"${entry.name}"` : "(anonymous)";
}
