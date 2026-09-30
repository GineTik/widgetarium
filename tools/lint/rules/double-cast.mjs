import { walk } from "../ast.mjs";
import { findingAt } from "../finding.mjs";

export const id = "double-cast";

const ASSERTIONS = new Set(["TSAsExpression", "TSTypeAssertion"]);
const EXCUSED_BY = "TRADE-OFF:";

export function check(source) {
	const excusedLines = tradeOffLinesOf(source);
	const findings = [];
	walk(source.ast.program, (node) => {
		if (!isCastThroughUnknown(node) || excusedLines.has(node.loc.start.line)) return;
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

function isCastThroughUnknown(node) {
	return (
		ASSERTIONS.has(node.type) &&
		ASSERTIONS.has(node.expression?.type) &&
		node.expression.typeAnnotation?.type === "TSUnknownKeyword"
	);
}

function tradeOffLinesOf(source) {
	const excused = new Set();
	for (const comment of source.comments) {
		if (!comment.value.trim().startsWith(EXCUSED_BY)) continue;
		excused.add(comment.loc.start.line);
		excused.add(comment.loc.end.line + 1);
	}
	return excused;
}
