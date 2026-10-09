import { isSourceNode, parsedSource, type SourceNode } from "../engine/node-marks.js";
import type { ProjectEntry } from "./project-entry.js";
import type { ProjectFinding } from "./project-finding.js";
import { isAuthoredModule, type ProjectFiles } from "./project-files.js";
import { filesUnder } from "./project-walk.js";

export interface ExportedBinding {
	readonly name: string;
	readonly declaration: SourceNode;
}

export interface DiscoveredExports {
	readonly entries: ProjectEntry[];
	readonly refused: ProjectFinding[];
}

type ExportFilter = (binding: ExportedBinding) => boolean;

const SOURCE_MODULE = /\.ts$/;
const HANDLER_BASE = /^(IQuery|ICommand)$/;
const SCHEMA_NAME = /Schema$/;
const UNPARSED = "could not be parsed as TypeScript, so nothing it exports was found";

export async function discoverHandlers(files: ProjectFiles, roots: readonly string[]): Promise<DiscoveredExports> {
	return discoverExports(files, roots, isHandler);
}

export async function discoverSchemas(files: ProjectFiles, roots: readonly string[]): Promise<DiscoveredExports> {
	return discoverExports(files, roots, isSchema);
}

function exportedBindingsOf(program: SourceNode): ExportedBinding[] {
	const statements = nodesAt(program, "body");
	const local = new Map(statements.flatMap(declaredBindingsOf).map((binding) => [binding.name, binding]));
	return statements.flatMap((statement) => {
		if (statement.type === "ExportDefaultDeclaration") return declaredBindingsOf(nodeAt(statement, "declaration"));
		if (statement.type !== "ExportNamedDeclaration") return [];
		const declared = nodeAt(statement, "declaration");
		if (declared) return declaredBindingsOf(declared);
		return nodesAt(statement, "specifiers").flatMap((specifier) => {
			const binding = local.get(identifierOf(nodeAt(specifier, "local")) ?? "");
			const name = identifierOf(nodeAt(specifier, "exported"));
			return binding && name ? [{ name, declaration: binding.declaration }] : [];
		});
	});
}

async function discoverExports(
	files: ProjectFiles,
	roots: readonly string[],
	isWanted: ExportFilter,
): Promise<DiscoveredExports> {
	const underRoots = await Promise.all(roots.map(async (root) => filesUnder(files, root)));
	const paths = [...new Set(underRoots.flat())].filter(isSourceModule);
	const read = await Promise.all(paths.map(async (path) => ({ path, program: programOf(await files.read(path)) })));
	return {
		entries: read.flatMap(({ path, program }) =>
			program
				? exportedBindingsOf(program)
						.filter(isWanted)
						.map(({ name }) => ({ name, path }))
				: [],
		),
		refused: read.flatMap(({ path, program }) => (program ? [] : [{ path, message: UNPARSED }])),
	};
}

function isSourceModule(path: string): boolean {
	return SOURCE_MODULE.test(path) && isAuthoredModule(path);
}

function programOf(source: string | null): SourceNode | null {
	const file = source === null ? null : parsedSource(source);
	return file ? nodeAt(file, "program") : null;
}

function isHandler({ declaration }: ExportedBinding): boolean {
	if (declaration.type !== "ClassDeclaration") return false;
	return HANDLER_BASE.test(rootIdentifierOf(nodeAt(declaration, "superClass")) ?? "");
}

function isSchema({ name, declaration }: ExportedBinding): boolean {
	return declaration.type === "VariableDeclarator" && SCHEMA_NAME.test(name);
}

function declaredBindingsOf(declaration: SourceNode | null): ExportedBinding[] {
	if (!declaration) return [];
	if (declaration.type === "VariableDeclaration")
		return nodesAt(declaration, "declarations").flatMap(declaredBindingsOf);
	const name = identifierOf(nodeAt(declaration, "id"));
	const isBinding = ["ClassDeclaration", "VariableDeclarator"].includes(declaration.type);
	return isBinding && name ? [{ name, declaration }] : [];
}

function rootIdentifierOf(node: SourceNode | null): string | null {
	if (!node) return null;
	if (node.type === "Identifier") return identifierOf(node);
	if (node.type === "CallExpression") return rootIdentifierOf(nodeAt(node, "callee"));
	if (node.type === "MemberExpression") return rootIdentifierOf(nodeAt(node, "object"));
	if (node.type === "TSInstantiationExpression") return rootIdentifierOf(nodeAt(node, "expression"));
	return null;
}

function identifierOf(node: SourceNode | null): string | null {
	const name = node?.["name"];
	return typeof name === "string" ? name : null;
}

function nodeAt(node: SourceNode, key: string): SourceNode | null {
	const held = node[key];
	return isSourceNode(held) ? held : null;
}

function nodesAt(node: SourceNode, key: string): SourceNode[] {
	const held = node[key];
	return Array.isArray(held) ? held.filter(isSourceNode) : [];
}
