import path from "node:path";
import { API } from "typescript/unstable/sync";
import * as ast from "typescript/unstable/ast";

const GATEWAY_KINDS = { CollectionGateway: "collection", ValueGateway: "value" };
const EVERY_COLLECTION_VERB = { list: "required", get: "required", create: "required", update: "required", remove: "required" };
const ONLY_READ = { get: "required" };
const MARKED_TYPES = { Day: "date", Text: "text", Color: "text" };
const KEYWORD_TYPES = {
	[ast.SyntaxKind.NumberKeyword]: "number",
	[ast.SyntaxKind.StringKeyword]: "text",
	[ast.SyntaxKind.BooleanKeyword]: "boolean",
};

const overlaid = new Map();
let held = null;

function apiNow() {
	if (held) return held;
	held = new API({
		cwd: process.cwd(),
		fs: { readFile: (name) => overlaid.get(name), fileExists: (name) => (overlaid.has(name) ? true : undefined) },
	});
	process.once("exit", () => held.close());
	return held;
}

function aliasesIn(file) {
	const found = new Map();
	for (const statement of file.statements) {
		const params = (statement.typeParameters ?? []).map((each) => each.name.text);
		if (ast.isTypeAliasDeclaration(statement)) found.set(statement.name.text, { params, type: statement.type });
		if (ast.isInterfaceDeclaration(statement)) found.set(statement.name.text, { params, type: statement });
	}
	return found;
}

function resolved(node, aliases, subs) {
	if (ast.isParenthesizedTypeNode(node)) return resolved(node.type, aliases, subs);
	if (!ast.isTypeReferenceNode(node) || !ast.isIdentifier(node.typeName)) return { node, subs };

	const bound = subs.get(node.typeName.text);
	if (bound) return resolved(bound.node, aliases, bound.subs);

	const alias = aliases.get(node.typeName.text);
	if (!alias) return { node, subs };

	const next = new Map();
	alias.params.forEach((name, at) => {
		const argument = node.typeArguments?.[at];
		if (argument) next.set(name, { node: argument, subs });
	});
	return resolved(alias.type, aliases, next);
}

function namedMembers(node, subs) {
	if (!ast.isTypeLiteralNode(node) && !ast.isInterfaceDeclaration(node)) return [];
	return node.members
		.filter((member) => ast.isPropertySignatureDeclaration(member) && member.type && ast.isIdentifier(member.name))
		.map((member) => ({ name: member.name.text, type: member.type, isOptional: member.postfixToken?.kind === ast.SyntaxKind.QuestionToken, subs }));
}

function membersOf(node, aliases, subs) {
	if (!node) return [];
	const found = resolved(node, aliases, subs);
	if (ast.isIntersectionTypeNode(found.node)) return found.node.types.flatMap((part) => membersOf(part, aliases, found.subs));
	return namedMembers(found.node, found.subs);
}

function gatewayIn(node, aliases, subs) {
	const found = resolved(node, aliases, subs);
	if (ast.isUnionTypeNode(found.node) || ast.isIntersectionTypeNode(found.node)) {
		return found.node.types.reduce((named, part) => named ?? gatewayIn(part, aliases, found.subs), null);
	}
	if (!ast.isTypeReferenceNode(found.node) || !ast.isIdentifier(found.node.typeName)) return null;

	const kind = GATEWAY_KINDS[found.node.typeName.text];
	return kind ? { kind, args: found.node.typeArguments ?? [], subs: found.subs } : null;
}

function verbsOf(gateway, aliases) {
	const wanted = gateway.args[1];
	if (!wanted) return gateway.kind === "collection" ? EVERY_COLLECTION_VERB : ONLY_READ;
	const asked = membersOf(wanted, aliases, gateway.subs).map((member) => [member.name, member.isOptional ? "optional" : "required"]);
	return Object.fromEntries(asked);
}

function literalsIn(node) {
	if (!node) return [];
	if (ast.isUnionTypeNode(node)) return node.types.flatMap(literalsIn);
	if (ast.isLiteralTypeNode(node) && ast.isStringLiteral(node.literal)) return [node.literal.text];
	return [];
}

function isNamed(node, name) {
	return ast.isTypeReferenceNode(node) && ast.isIdentifier(node.typeName) && node.typeName.text === name;
}

function akaIn(node) {
	if (isNamed(node, "Aka")) return literalsIn(node.typeArguments?.[0]);
	let names = null;
	node.forEachChild((child) => {
		names ??= akaIn(child);
	});
	return names;
}

function readingOf(node, reading = { type: null, isMany: false }) {
	if (isNamed(node, "Aka")) return reading;
	if (ast.isArrayTypeNode(node) || isNamed(node, "Array")) reading.isMany = true;
	if (ast.isTypeReferenceNode(node) && ast.isIdentifier(node.typeName)) reading.type ??= MARKED_TYPES[node.typeName.text] ?? null;
	reading.type ??= KEYWORD_TYPES[node.kind] ?? null;
	node.forEachChild((child) => {
		readingOf(child, reading);
	});
	return reading;
}

function needsOf(gateway, aliases) {
	const found = {};
	for (const member of membersOf(gateway.args[0], aliases, gateway.subs)) {
		const aka = akaIn(member.type);
		if (!aka) continue;
		const reading = readingOf(member.type);
		found[member.name] = { type: reading.type, ...(reading.isMany ? { many: true } : {}), aka };
	}
	return found;
}

function createWidgetCallIn(file) {
	let call = null;
	const look = (node) => {
		if (call) return;
		if (ast.isCallExpression(node) && ast.isIdentifier(node.expression) && node.expression.text === "createWidget") call = node;
		else node.forEachChild(look);
	};
	file.forEachChild(look);
	return call;
}

function componentIn(call, file) {
	const given = call?.arguments[0];
	if (!given) return null;
	if (ast.isFunctionExpression(given) || ast.isArrowFunction(given)) return given;
	if (!ast.isIdentifier(given)) return null;
	return file.statements.find((statement) => ast.isFunctionDeclaration(statement) && statement.name?.text === given.text) ?? null;
}

function componentParameterIn(file) {
	return componentIn(createWidgetCallIn(file), file)?.parameters[0]?.type ?? null;
}

function specOf(gateway, aliases) {
	const needs = needsOf(gateway, aliases);
	return { kind: gateway.kind, verbs: verbsOf(gateway, aliases), ...(Object.keys(needs).length ? { needs } : {}) };
}

function propsIn(file) {
	const parameter = componentParameterIn(file);
	if (!parameter) return null;

	const aliases = aliasesIn(file);
	const found = {};
	for (const member of membersOf(parameter, aliases, new Map())) {
		const gateway = gatewayIn(member.type, aliases, member.subs);
		if (gateway) found[member.name] = specOf(gateway, aliases);
	}
	return Object.keys(found).length ? found : null;
}

// TRADE-OFF: restates the engine's own merge — that module is importable only through the mirror this feeds
export function recordUnderItsTypes(record, source, at) {
	const derived = propsFromTypes(source, at);
	return derived ? { ...record, props: derived } : record;
}

export function propsFromTypes(source, at) {
	const fileName = path.resolve(at);
	overlaid.set(fileName, source);
	const snapshot = apiNow().updateSnapshot({ openFiles: [fileName] });
	try {
		const file = snapshot.getDefaultProjectForFile(fileName)?.program.getSourceFile(fileName);
		return file ? propsIn(file) : null;
	} finally {
		snapshot.dispose();
	}
}
