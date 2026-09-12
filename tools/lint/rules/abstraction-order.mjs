import { topLevelDeclarations } from "../ast.mjs";
import { findingAt } from "../finding.mjs";

export const id = "abstraction-order";

export function check(source) {
	const declarations = topLevelDeclarations(source.ast);
	const lastExported = lastExportedIndex(declarations);
	if (lastExported < 0) return [];
	const entry = declarations[lastExported];
	const findings = [];
	for (let index = 0; index < lastExported; index += 1) {
		const declaration = declarations[index];
		if (declaration.exported || declaration.kind !== "function") continue;
		const message = `${labelOf(declaration)} stands above the exported ${labelOf(entry)}; the highest abstraction goes first, helpers below it`;
		findings.push(findingAt(id, "error", declaration.statement, message));
	}
	return findings;
}

function lastExportedIndex(declarations) {
	for (let index = declarations.length - 1; index >= 0; index -= 1) {
		const declaration = declarations[index];
		if (declaration.exported && declaration.kind === "function") return index;
	}
	return -1;
}

function labelOf(declaration) {
	return declaration.name ? `"${declaration.name}"` : "declaration";
}
