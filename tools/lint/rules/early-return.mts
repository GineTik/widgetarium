import type { Expression, JSXElement, JSXFragment, Node, ReturnStatement, Statement } from "@babel/types";
import { bodyStatements, functionsOf, walkOwnScope, type FunctionEntry } from "../ast.mts";
import { findingAt, type Finding } from "../finding.mts";
import type { ParsedSource } from "../source.mts";

type DrawnChild = JSXElement["children"][number];

export const id = "early-return";

export function check(source: ParsedSource): Finding[] {
	const findings: Finding[] = [];
	for (const component of functionsOf(source.ast)) {
		if (!component.isComponent) continue;
		const statements = bodyStatements(component.node);
		for (const statement of statements.slice(0, -1)) {
			findings.push(...guardsOf(statement, component));
		}
	}
	return findings;
}

function guardsOf(statement: Statement, component: FunctionEntry): Finding[] {
	const returns: ReturnStatement[] = [];
	walkOwnScope({ statement }, (node: Node) => {
		if (node.type === "ReturnStatement") returns.push(node);
	});
	return returns.flatMap((node) => verdict(node, component));
}

function verdict(node: ReturnStatement, component: FunctionEntry): Finding[] {
	const markup = markupOf(node.argument);
	if (!markup) return [];
	if (markup.type === "JSXFragment") return [flag(node, component, "a fragment")];
	const children = markup.children.filter(isDrawn);
	if (children.length === 0) return [];
	return [flag(node, component, `${children.length} nested nodes`)];
}

function markupOf(argument: Expression | null | undefined): JSXElement | JSXFragment | null {
	if (!argument) return null;
	if (argument.type === "JSXElement" || argument.type === "JSXFragment") return argument;
	if (argument.type === "ParenthesizedExpression") return markupOf(argument.expression);
	return null;
}

function isDrawn(child: DrawnChild): boolean {
	if (child.type === "JSXText") return child.value.trim().length > 0;
	return child.type === "JSXElement" || child.type === "JSXFragment" || child.type === "JSXExpressionContainer";
}

function flag(node: ReturnStatement, component: FunctionEntry, shape: string): Finding {
	const message = `early return in "${component.name}" draws ${shape}; a guard returns one component, everything it needs goes in its props`;
	return findingAt(id, "error", node, message);
}
