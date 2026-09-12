import { functionsOf } from "../ast.mjs";
import { findingAt } from "../finding.mjs";
import { LIMITS } from "../limits.mjs";

export const id = "one-per-file";

export function check(source) {
	const declared = functionsOf(source.ast);
	const components = declared.filter((entry) => entry.isComponent);
	const hooks = declared.filter((entry) => entry.isHook);
	return [
		...extras(components, "component", "error", LIMITS.componentsPerFile.error),
		...extras(hooks, "hook", "warn", LIMITS.hooksPerFile.warn),
	];
}

function extras(declared, kind, severity, allowed) {
	if (declared.length <= allowed) return [];
	const first = labelOf(declared[0]);
	return declared.slice(allowed).map((entry) => {
		const message = `${kind} ${labelOf(entry)} shares the file with ${first}; one ${kind} per file`;
		return findingAt(id, severity, entry.node, message);
	});
}

function labelOf(entry) {
	return entry.name ? `"${entry.name}"` : "(anonymous)";
}
