import type { Node } from "@babel/types";
import { functionsOf, type FunctionEntry } from "../ast.mts";
import { findingAt, type Finding } from "../finding.mts";
import { LIMITS, severityFor } from "../limits.mts";
import type { ParsedSource } from "../source.mts";

export const id = "props-width";

export function check(source: ParsedSource): Finding[] {
	const entry = entryNameOf(source);
	const findings: Finding[] = [];
	for (const component of functionsOf(source.ast)) {
		if (!component.isComponent || isEntry(component, entry)) continue;
		const pattern = component.node.params[0];
		if (pattern?.type !== "ObjectPattern") continue;
		const severity = severityFor(pattern.properties.length, LIMITS.propsWidth);
		if (!severity) continue;
		const message = `component "${component.name}" takes ${pattern.properties.length} props, limit is ${LIMITS.propsWidth[severity]}; hand it the gateway it reads instead of the fields you unpacked from it`;
		findings.push(findingAt(id, severity, pattern, message));
	}
	return findings;
}

function isEntry(component: FunctionEntry, entry: string): boolean {
	const { parent } = component;
	if (parent?.type === "CallExpression" && parent.callee.type === "Identifier" && parent.callee.name === "createWidget")
		return true;
	return entry.length > 0 && component.name === entry;
}

function entryNameOf(source: ParsedSource): string {
	if (!source.isWidgetEntry) return "";
	for (const statement of source.ast.program.body) {
		if (statement.type === "ExportDefaultDeclaration") return exportedName(statement.declaration);
	}
	return "";
}

function exportedName(node: Node | null | undefined): string {
	if (!node) return "";
	if (node.type === "Identifier") return node.name;
	if (node.type === "FunctionDeclaration") return node.id?.name ?? "";
	if (node.type === "CallExpression") return exportedName(node.arguments[0]);
	return "";
}
