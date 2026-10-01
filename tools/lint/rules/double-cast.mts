import type { Node, TSAsExpression, TSTypeAssertion } from "@babel/types";
import { walk } from "../ast.mts";
import { findingAt, type Finding } from "../finding.mts";
import type { ParsedSource } from "../source.mts";

export const id = "double-cast";

const EXCUSED_BY = "TRADE-OFF:";

export function check(source: ParsedSource): Finding[] {
	const excusedLines = tradeOffLinesOf(source);
	const findings: Finding[] = [];
	walk(source.ast.program, (node) => {
		if (!isCastThroughUnknown(node) || excusedLines.has(node.loc?.start.line ?? 0)) return;
		findings.push(
			findingAt(
				id,
				"error",
				node,
				"a cast through unknown asserts what nothing checked; use a type guard, a generic or the named type, or say the TypeScript limitation in a TRADE-OFF:",
			),
		);
	});
	return findings;
}

function isAssertion(node: Node): node is TSAsExpression | TSTypeAssertion {
	return node.type === "TSAsExpression" || node.type === "TSTypeAssertion";
}

function isCastThroughUnknown(node: Node): boolean {
	return (
		isAssertion(node) && isAssertion(node.expression) && node.expression.typeAnnotation.type === "TSUnknownKeyword"
	);
}

function tradeOffLinesOf(source: ParsedSource): Set<number> {
	const excused = new Set<number>();
	for (const comment of source.comments) {
		if (!comment.value.trim().startsWith(EXCUSED_BY) || !comment.loc) continue;
		excused.add(comment.loc.start.line);
		excused.add(comment.loc.end.line + 1);
	}
	return excused;
}
