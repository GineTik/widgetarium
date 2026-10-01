import { functionsOf, type FunctionEntry } from "../ast.mts";
import { findingAt, type Finding, type Severity } from "../finding.mts";
import { LIMITS } from "../limits.mts";
import type { ParsedSource } from "../source.mts";

interface ExtrasAsk {
	readonly kind: string;
	readonly severity: Severity;
	readonly allowed: number;
}

export const id = "one-per-file";

export function check(source: ParsedSource): Finding[] {
	const declared = functionsOf(source.ast);
	const components = declared.filter((entry) => entry.isComponent);
	const hooks = declared.filter((entry) => entry.isHook);
	return [
		...extras(components, { kind: "component", severity: "error", allowed: LIMITS.componentsPerFile.error }),
		...extras(hooks, { kind: "hook", severity: "warn", allowed: LIMITS.hooksPerFile.warn }),
	];
}

function extras(declared: readonly FunctionEntry[], { kind, severity, allowed }: ExtrasAsk): Finding[] {
	const [firstEntry] = declared;
	if (!firstEntry || declared.length <= allowed) return [];
	const first = labelOf(firstEntry);
	return declared.slice(allowed).map((entry) => {
		const message = `${kind} ${labelOf(entry)} shares the file with ${first}; one ${kind} per file`;
		return findingAt(id, severity, entry.node, message);
	});
}

function labelOf(entry: FunctionEntry): string {
	return entry.name ? `"${entry.name}"` : "(anonymous)";
}
