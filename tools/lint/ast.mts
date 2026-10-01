import type {
	ArrowFunctionExpression,
	CallExpression,
	ClassMethod,
	File,
	FunctionDeclaration,
	FunctionExpression,
	Node,
	ObjectMethod,
	Statement,
} from "@babel/types";

export type FunctionNode =
	FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | ObjectMethod | ClassMethod;

export interface FunctionEntry {
	readonly node: FunctionNode;
	readonly parent: Node | null;
	readonly name: string;
	readonly isComponent: boolean;
	readonly isHook: boolean;
}

export type DeclarationKind = "function" | "type" | "import" | "reexport" | "value" | "other";

export interface TopLevelDeclaration {
	readonly statement: Statement;
	readonly exported: boolean;
	readonly kind: DeclarationKind;
	readonly name: string;
}

type Visit = (node: Node, parent: Node | null) => void;
type Shape = Pick<TopLevelDeclaration, "kind" | "name">;

const IGNORED_KEYS = new Set([
	"loc",
	"start",
	"end",
	"range",
	"leadingComments",
	"trailingComments",
	"innerComments",
	"extra",
	"comments",
	"tokens",
]);

const FUNCTION_TYPES = new Set([
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression",
	"ObjectMethod",
	"ClassMethod",
]);

export function walk(node: unknown, visit: Visit, parent: Node | null = null): void {
	if (!isNode(node)) return;
	visit(node, parent);
	for (const value of childrenOf(node)) {
		if (Array.isArray(value)) {
			for (const item of value) walk(item, visit, node);
			continue;
		}
		walk(value, visit, node);
	}
}

export function walkOwnScope(root: object, visit: (node: Node) => void): void {
	for (const value of childrenOf(root)) descend(value, visit);
}

export function lineSpanOf(node: Node): number {
	if (!node.loc) return 1;
	return node.loc.end.line - node.loc.start.line + 1;
}

export function bodyStatements(node: FunctionNode): Statement[] {
	return node.body.type === "BlockStatement" ? node.body.body : [];
}

export function returnsMarkup(node: FunctionNode): boolean {
	let found = false;
	walk(node.body, (inner) => {
		if (found) return;
		if (inner.type === "JSXElement" || inner.type === "JSXFragment") found = true;
		if (inner.type === "CallExpression" && inner.callee.type === "Identifier" && inner.callee.name === "h")
			found = true;
	});
	return found;
}

export function functionsOf(ast: File): FunctionEntry[] {
	const functions: FunctionEntry[] = [];
	walk(ast.program, (node, parent) => {
		if (!isFunction(node)) return;
		const name = nameOf(node, parent);
		functions.push({
			node,
			parent,
			name,
			isComponent: isComponentName(name) && returnsMarkup(node),
			isHook: isHookName(name),
		});
	});
	return functions;
}

export function topLevelDeclarations(ast: File): TopLevelDeclaration[] {
	return ast.program.body.map((statement) => describe(statement));
}

function isNode(value: unknown): value is Node {
	return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function childrenOf(owner: object): unknown[] {
	const entries: [string, unknown][] = Object.entries(owner);
	return entries.filter(([key]) => !IGNORED_KEYS.has(key)).map(([, value]) => value);
}

function isFunction(node: Node): node is FunctionNode {
	return FUNCTION_TYPES.has(node.type);
}

function nameOf(node: FunctionNode, parent: Node | null): string {
	if ("id" in node && node.id?.name) return node.id.name;
	if ("key" in node && node.key.type === "Identifier" && node.key.name) return node.key.name;
	if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") return parent.id.name;
	if (parent?.type === "AssignmentExpression" && parent.left.type === "Identifier") return parent.left.name;
	return "";
}

function isComponentName(name: string): boolean {
	return /^[A-Z]/.test(name);
}

function isHookName(name: string): boolean {
	return /^use[A-Z]/.test(name);
}

function descend(value: unknown, visit: (node: Node) => void): void {
	if (Array.isArray(value)) {
		for (const item of value) descend(item, visit);
		return;
	}
	if (!isNode(value)) return;
	visit(value);
	if (FUNCTION_TYPES.has(value.type)) return;
	for (const child of childrenOf(value)) descend(child, visit);
}

function describe(statement: Statement): TopLevelDeclaration {
	if (statement.type === "ExportDefaultDeclaration")
		return { statement, exported: true, ...shapeOf(statement.declaration) };
	if (statement.type === "ExportNamedDeclaration" && statement.declaration)
		return { statement, exported: true, ...shapeOf(statement.declaration) };
	if (statement.type === "ExportNamedDeclaration") return { statement, exported: true, kind: "reexport", name: "" };
	return { statement, exported: false, ...shapeOf(statement) };
}

function shapeOf(node: Node | null | undefined): Shape {
	if (!node) return { kind: "other", name: "" };
	if (node.type === "FunctionDeclaration") return { kind: "function", name: node.id?.name ?? "" };
	if (node.type === "ClassDeclaration") return { kind: "function", name: node.id?.name ?? "" };
	if (node.type === "VariableDeclaration") return variableShapeOf(node.declarations[0]);
	if (node.type === "CallExpression") return { kind: "function", name: wrappedName(node) };
	if (node.type === "TSTypeAliasDeclaration" || node.type === "TSInterfaceDeclaration")
		return { kind: "type", name: node.id.name };
	if (node.type === "ImportDeclaration") return { kind: "import", name: "" };
	return { kind: "other", name: "" };
}

function variableShapeOf(declarator: Node | undefined): Shape {
	if (declarator?.type !== "VariableDeclarator") return { kind: "value", name: "" };
	const init = declarator.init;
	const name = declarator.id.type === "Identifier" ? declarator.id.name : "";
	if (init && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression"))
		return { kind: "function", name };
	if (init && init.type === "CallExpression" && isWrapper(init)) return { kind: "function", name };
	return { kind: "value", name };
}

function isWrapper(node: CallExpression): boolean {
	return node.arguments.some(
		(argument) => argument.type === "ArrowFunctionExpression" || argument.type === "FunctionExpression",
	);
}

function wrappedName(node: CallExpression): string {
	for (const argument of node.arguments) {
		if (argument.type === "FunctionExpression" && argument.id?.name) return argument.id.name;
	}
	if (node.callee.type === "Identifier") return node.callee.name;
	return "";
}
