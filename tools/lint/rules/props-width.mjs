import { functionsOf } from "../ast.mjs";
import { findingAt } from "../finding.mjs";
import { LIMITS, severityFor } from "../limits.mjs";

export const id = "props-width";

export function check(source) {
	if (!source.ast) return [];
	const entry = entryNameOf(source);
	const findings = [];
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

function isEntry(component, entry) {
	if (component.parent?.type === "CallExpression" && component.parent.callee?.name === "createWidget") return true;
	return entry.length > 0 && component.name === entry;
}

function entryNameOf(source) {
	if (!source.isWidgetEntry) return "";
	const exported = source.ast.program.body.find((statement) => statement.type === "ExportDefaultDeclaration");
	return exportedName(exported?.declaration);
}

function exportedName(node) {
	if (!node) return "";
	if (node.type === "Identifier") return node.name;
	if (node.type === "FunctionDeclaration") return node.id?.name ?? "";
	if (node.type === "CallExpression") return exportedName(node.arguments[0]);
	return "";
}
