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

export function walk(node, visit, parent = null) {
	if (!node || typeof node.type !== "string") return;
	visit(node, parent);
	for (const key of Object.keys(node)) {
		if (IGNORED_KEYS.has(key)) continue;
		const value = node[key];
		if (Array.isArray(value)) {
			for (const item of value) walk(item, visit, node);
			continue;
		}
		walk(value, visit, node);
	}
}

export function walkOwnScope(root, visit) {
	for (const key of Object.keys(root)) {
		if (IGNORED_KEYS.has(key)) continue;
		descend(root[key], visit);
	}
}

export function lineSpanOf(node) {
	return node.loc.end.line - node.loc.start.line + 1;
}

export function bodyStatements(node) {
	return node.body?.type === "BlockStatement" ? node.body.body : [];
}

export function returnsMarkup(node) {
	let found = false;
	walk(node.body, (inner) => {
		if (found) return;
		if (inner.type === "JSXElement" || inner.type === "JSXFragment") found = true;
		if (inner.type === "CallExpression" && inner.callee?.type === "Identifier" && inner.callee.name === "h")
			found = true;
	});
	return found;
}

export function functionsOf(ast) {
	const functions = [];
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

export function topLevelDeclarations(ast) {
	return ast.program.body.map((statement) => describe(statement));
}

function isFunction(node) {
	return FUNCTION_TYPES.has(node.type);
}

function nameOf(node, parent) {
	if (node.id?.name) return node.id.name;
	if (node.key?.name) return node.key.name;
	if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") return parent.id.name;
	if (parent?.type === "AssignmentExpression" && parent.left?.type === "Identifier") return parent.left.name;
	return "";
}

function isComponentName(name) {
	return /^[A-Z]/.test(name);
}

function isHookName(name) {
	return /^use[A-Z]/.test(name);
}

function descend(node, visit) {
	if (Array.isArray(node)) {
		for (const item of node) descend(item, visit);
		return;
	}
	if (!node || typeof node.type !== "string") return;
	visit(node);
	if (FUNCTION_TYPES.has(node.type)) return;
	for (const key of Object.keys(node)) {
		if (IGNORED_KEYS.has(key)) continue;
		descend(node[key], visit);
	}
}

function describe(statement) {
	if (statement.type === "ExportDefaultDeclaration")
		return { statement, exported: true, ...shapeOf(statement.declaration) };
	if (statement.type === "ExportNamedDeclaration" && statement.declaration)
		return { statement, exported: true, ...shapeOf(statement.declaration) };
	if (statement.type === "ExportNamedDeclaration") return { statement, exported: true, kind: "reexport", name: "" };
	return { statement, exported: false, ...shapeOf(statement) };
}

function shapeOf(node) {
	if (!node) return { kind: "other", name: "" };
	if (node.type === "FunctionDeclaration") return { kind: "function", name: node.id?.name ?? "", fn: node };
	if (node.type === "ClassDeclaration") return { kind: "function", name: node.id?.name ?? "", fn: node };
	if (node.type === "VariableDeclaration") return variableShapeOf(node);
	if (node.type === "CallExpression") return { kind: "function", name: wrappedName(node), fn: node };
	if (node.type === "TSTypeAliasDeclaration" || node.type === "TSInterfaceDeclaration")
		return { kind: "type", name: node.id?.name ?? "" };
	if (node.type === "ImportDeclaration") return { kind: "import", name: "" };
	return { kind: "other", name: "" };
}

function variableShapeOf(node) {
	const declarator = node.declarations[0];
	const init = declarator?.init;
	const name = declarator?.id?.type === "Identifier" ? declarator.id.name : "";
	if (init && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression"))
		return { kind: "function", name, fn: init };
	if (init && init.type === "CallExpression" && isWrapper(init)) return { kind: "function", name, fn: init };
	return { kind: "value", name };
}

function isWrapper(node) {
	return node.arguments.some(
		(argument) => argument.type === "ArrowFunctionExpression" || argument.type === "FunctionExpression",
	);
}

function wrappedName(node) {
	const named = node.arguments.find((argument) => argument.type === "FunctionExpression" && argument.id?.name);
	if (named) return named.id.name;
	if (node.callee?.type === "Identifier") return node.callee.name;
	return "";
}
