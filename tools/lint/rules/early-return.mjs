import { bodyStatements, functionsOf, walkOwnScope } from "../ast.mjs";
import { findingAt } from "../finding.mjs";

export const id = "early-return";

export function check(source) {
	if (!source.ast) return [];
	const findings = [];
	for (const component of functionsOf(source.ast)) {
		if (!component.isComponent) continue;
		const statements = bodyStatements(component.node);
		for (const statement of statements.slice(0, -1)) {
			findings.push(...guardsOf(statement, component));
		}
	}
	return findings;
}

function guardsOf(statement, component) {
	const returns = [];
	walkOwnScope({ statement }, (node) => {
		if (node.type === "ReturnStatement") returns.push(node);
	});
	return returns.flatMap((node) => verdict(node, component));
}

function verdict(node, component) {
	const markup = markupOf(node.argument);
	if (!markup) return [];
	if (markup.type === "JSXFragment") return [flag(node, component, "a fragment")];
	const children = markup.children.filter(isDrawn);
	if (children.length === 0) return [];
	return [flag(node, component, `${children.length} nested nodes`)];
}

function markupOf(argument) {
	if (!argument) return null;
	if (argument.type === "JSXElement" || argument.type === "JSXFragment") return argument;
	if (argument.type === "ParenthesizedExpression") return markupOf(argument.expression);
	return null;
}

function isDrawn(child) {
	if (child.type === "JSXText") return child.value.trim().length > 0;
	return child.type === "JSXElement" || child.type === "JSXFragment" || child.type === "JSXExpressionContainer";
}

function flag(node, component, shape) {
	const message = `early return in "${component.name}" draws ${shape}; a guard returns one component, everything it needs goes in its props`;
	return findingAt(id, "error", node, message);
}
