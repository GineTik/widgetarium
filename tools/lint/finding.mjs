export function findingAt(rule, severity, node, message) {
	return { rule, severity, line: node.loc.start.line, column: node.loc.start.column + 1, message };
}

export function findingOnLine(rule, severity, line, message) {
	return { rule, severity, line, column: 1, message };
}
