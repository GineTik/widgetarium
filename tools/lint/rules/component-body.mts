import type { Statement, VariableDeclaration } from "@babel/types";
import { bodyStatements, functionsOf, walkOwnScope, type FunctionEntry } from "../ast.mts";
import { findingAt, type Finding } from "../finding.mts";
import { LIMITS, severityFor } from "../limits.mts";
import type { ParsedSource } from "../source.mts";

export const id = "component-body";

const EFFECTS = new Set(["useEffect", "useLayoutEffect", "useInsertionEffect"]);

export function check(source: ParsedSource): Finding[] {
	const findings: Finding[] = [];
	for (const component of functionsOf(source.ast)) {
		if (!component.isComponent) continue;
		findings.push(...density(component), ...effects(component));
	}
	return findings;
}

function density(component: FunctionEntry): Finding[] {
	const declared = bodyStatements(component.node).filter(isVariableDeclaration);
	const count = declared.reduce((total, statement) => total + statement.declarations.length, 0);
	const severity = severityFor(count, LIMITS.componentLocalDeclarations);
	if (!severity) return [];
	const limit = LIMITS.componentLocalDeclarations[severity];
	const message = `component "${component.name}" unpacks ${count} values before it draws, limit is ${limit}; hide them behind a hook or pass them down as they arrived`;
	return [findingAt(id, severity, component.node, message)];
}

function effects(component: FunctionEntry): Finding[] {
	const findings: Finding[] = [];
	walkOwnScope(component.node, (node) => {
		if (node.type !== "CallExpression") return;
		if (node.callee.type !== "Identifier" || !EFFECTS.has(node.callee.name)) return;
		const message = `${node.callee.name} runs inside component "${component.name}"; an effect belongs in a use-hook of its own`;
		findings.push(findingAt(id, "error", node, message));
	});
	return findings;
}

function isVariableDeclaration(statement: Statement): statement is VariableDeclaration {
	return statement.type === "VariableDeclaration";
}
