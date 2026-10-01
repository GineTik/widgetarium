import type { SourceLocation } from "@babel/types";

export type Severity = "error" | "warn";

export interface Finding {
	readonly rule: string;
	readonly severity: Severity;
	readonly line: number;
	readonly column: number;
	readonly message: string;
}

export interface Located {
	readonly loc?: SourceLocation | null | undefined;
}

export function findingAt(rule: string, severity: Severity, node: Located, message: string): Finding {
	const start = node.loc?.start;
	return { rule, severity, line: start?.line ?? 1, column: (start?.column ?? 0) + 1, message };
}

export function findingOnLine(rule: string, severity: Severity, line: number, message: string): Finding {
	return { rule, severity, line, column: 1, message };
}
