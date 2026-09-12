import { walk } from "../ast.mjs";
import { findingAt } from "../finding.mjs";

export const id = "typing";

const SUPPRESSIONS = ["@ts-ignore", "@ts-nocheck", "@ts-expect-error"];

export function check(source) {
	const findings = [...suppressions(source)];
	walk(source.ast.program, (node) => {
		if (node.type === "TSAnyKeyword") {
			findings.push(findingAt(id, "error", node, "any is forbidden; write the type the value actually has"));
		}
		if (node.type === "TSUnknownKeyword") {
			findings.push(
				findingAt(
					id,
					"warn",
					node,
					"unknown is allowed only where data really arrives unparsed; parse it and name the type",
				),
			);
		}
	});
	return findings;
}

function suppressions(source) {
	return source.comments
		.filter((comment) => SUPPRESSIONS.some((marker) => comment.value.includes(marker)))
		.map((comment) => findingAt(id, "error", comment, "a type suppression hides the error instead of answering it"));
}
