import { parse } from "@babel/parser";
import { CliRefusal } from "./cli-output.js";

type Statement = ReturnType<typeof parse>["program"]["body"][number];
type ImportStatement = Extract<Statement, { type: "ImportDeclaration" }>;
type ExportListStatement = Extract<Statement, { type: "ExportNamedDeclaration" }>;
type Declaration = NonNullable<ExportListStatement["declaration"]> | Statement;
type NameNode =
	{ readonly type: "Identifier"; readonly name: string } | { readonly type: "StringLiteral"; readonly value: string };

export interface SourceRange {
	readonly start: number;
	readonly end: number;
}

export interface LinkedName {
	readonly name: string;
	readonly as: string;
	readonly typeOnly: boolean;
}

export interface ModuleLink {
	readonly kind: "import" | "reexport" | "reexport-all";
	readonly specifier: string;
	readonly names: readonly LinkedName[];
	readonly range: SourceRange;
	readonly specifierRange: SourceRange;
}

export interface KitModule {
	readonly path: string;
	readonly text: string;
	readonly links: readonly ModuleLink[];
	readonly declared: readonly string[];
	readonly exported: ReadonlyMap<string, string>;
	readonly exportsDefault: boolean;
}

const TSX = /\.tsx$/;
const DECLARATION_FILE = /\.d\.ts$/;

export function kitModuleOf(path: string, text: string): KitModule {
	const statements = parse(text, { sourceType: "module", plugins: pluginsFor(path) }).program.body;
	return {
		path,
		text,
		links: statements.flatMap((statement) => linksOf(path, statement)),
		declared: statements.flatMap((statement) => namesDeclaredBy(path, statement)),
		exported: new Map(statements.flatMap((statement) => exportedNamesOf(path, statement))),
		exportsDefault: statements.some(({ type }) => type === "ExportDefaultDeclaration" || type === "TSExportAssignment"),
	};
}

export function refuseUnmergeable(path: string, what: string): never {
	throw new CliRefusal(`the kit cannot be merged into one file per component: ${path} ${what}`);
}

function pluginsFor(path: string): ["jsx", "typescript"] | [["typescript", { dts: boolean }]] {
	if (TSX.test(path)) return ["jsx", "typescript"];
	return [["typescript", { dts: DECLARATION_FILE.test(path) }]];
}

function linksOf(path: string, statement: Statement): ModuleLink[] {
	if (statement.type === "ImportDeclaration") return [linkOf("import", statement, importedNamesOf(path, statement))];
	if (statement.type === "ExportAllDeclaration") return [linkOf("reexport-all", statement, [])];
	if (statement.type !== "ExportNamedDeclaration" || !statement.source) return [];
	return [linkOf("reexport", { ...statement, source: statement.source }, reexportedNamesOf(path, statement))];
}

function linkOf(
	kind: ModuleLink["kind"],
	statement: { readonly source: { readonly value: string } & PositionedNode } & PositionedNode,
	names: readonly LinkedName[],
): ModuleLink {
	return {
		kind,
		specifier: statement.source.value,
		names,
		range: rangeOf(statement),
		specifierRange: rangeOf(statement.source),
	};
}

function importedNamesOf(path: string, statement: ImportStatement): LinkedName[] {
	return statement.specifiers.map((specifier) => {
		if (specifier.type !== "ImportSpecifier") return refuseUnmergeable(path, `uses a ${specifier.type}`);
		const typeOnly = statement.importKind === "type" || specifier.importKind === "type";
		return { name: nameOf(specifier.imported), as: specifier.local.name, typeOnly };
	});
}

function reexportedNamesOf(path: string, statement: ExportListStatement): LinkedName[] {
	return statement.specifiers.map((specifier) => {
		if (specifier.type !== "ExportSpecifier") return refuseUnmergeable(path, `uses a ${specifier.type}`);
		const typeOnly = statement.exportKind === "type" || specifier.exportKind === "type";
		return { name: nameOf(specifier.local), as: nameOf(specifier.exported), typeOnly };
	});
}

function exportedNamesOf(path: string, statement: Statement): [string, string][] {
	if (statement.type !== "ExportNamedDeclaration" || statement.source) return [];
	if (statement.declaration) return namesDeclaredBy(path, statement).map((name) => [name, name]);
	return reexportedNamesOf(path, statement).map(({ name, as }) => [as, name]);
}

function namesDeclaredBy(path: string, statement: Statement): string[] {
	const declaration: Declaration | null | undefined =
		statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
	if (!declaration) return [];
	if (declaration.type === "VariableDeclaration") {
		return declaration.declarations.map(({ id }) =>
			id.type === "Identifier" ? id.name : refuseUnmergeable(path, "destructures a top-level binding"),
		);
	}
	if (!("id" in declaration) || !declaration.id || declaration.id.type !== "Identifier") return [];
	return [declaration.id.name];
}

function nameOf(node: NameNode): string {
	return node.type === "Identifier" ? node.name : node.value;
}

interface PositionedNode {
	readonly start?: number | null;
	readonly end?: number | null;
}

function rangeOf(node: PositionedNode): SourceRange {
	if (typeof node.start !== "number" || typeof node.end !== "number") throw new Error("a parsed node carries no range");
	return { start: node.start, end: node.end };
}
