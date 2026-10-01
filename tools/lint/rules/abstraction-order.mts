import { topLevelDeclarations, type TopLevelDeclaration } from "../ast.mts";
import { findingAt, type Finding } from "../finding.mts";
import type { ParsedSource } from "../source.mts";

export const id = "abstraction-order";

export function check(source: ParsedSource): Finding[] {
	const declarations = topLevelDeclarations(source.ast);
	const lastExported = lastExportedIndex(declarations);
	const entry = declarations[lastExported];
	if (!entry) return [];
	const findings: Finding[] = [];
	for (const declaration of declarations.slice(0, lastExported)) {
		if (declaration.exported || declaration.kind !== "function") continue;
		const message = `${labelOf(declaration)} stands above the exported ${labelOf(entry)}; the highest abstraction goes first, helpers below it`;
		findings.push(findingAt(id, "error", declaration.statement, message));
	}
	return findings;
}

function lastExportedIndex(declarations: readonly TopLevelDeclaration[]): number {
	return declarations.findLastIndex((declaration) => declaration.exported && declaration.kind === "function");
}

function labelOf(declaration: TopLevelDeclaration): string {
	return declaration.name ? `"${declaration.name}"` : "declaration";
}
