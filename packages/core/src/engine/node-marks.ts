import { parse } from "@babel/parser";
import { contentHash } from "./content-hash.js";

export const NODE_MARK = "data-wg-node";
export const WIDGET_MARK = "data-wg-widget";
export const HELD_MARK = "data-wg-held";
export const SCOPE_MARK = "data-wg-scope";

const PAGE_FOLDER = /-page$/;
const SOURCE_PLUGINS = ["jsx", "typescript"] as const;
const MARK_SHAPE = /^(.+)#(\d+):(\d+)$/;
const FUNCTIONS = new Set([
	"ArrowFunctionExpression",
	"FunctionExpression",
	"FunctionDeclaration",
	"ObjectMethod",
	"ClassMethod",
]);

export interface SourceNode {
	readonly type: string;
	readonly start: number;
	readonly end: number;
	readonly [key: string]: unknown;
}

export interface NodeMark {
	readonly file: string;
	readonly sourceKey: string;
	readonly start: number;
}

export function isPageFolder(folder: string): boolean {
	return PAGE_FOLDER.test(folder);
}

export function nodeMarkOf(file: string, sourceKey: string, start: number): string {
	return `${file}#${sourceKey}:${start}`;
}

export function readNodeMark(mark: string): NodeMark | null {
	const [, file, sourceKey, start] = MARK_SHAPE.exec(mark) ?? [];
	if (!file || !sourceKey || !start) return null;
	return { file, sourceKey, start: Number(start) };
}

export function sourceKeyOf(source: string): string {
	return contentHash(source);
}

export function parsedSource(source: string): SourceNode | null {
	try {
		const parsed: unknown = parse(source, { sourceType: "module", plugins: [...SOURCE_PLUGINS] });
		return isSourceNode(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function jsxElementsIn(root: SourceNode): SourceNode[] {
	return nodesIn(root, (node) => node.type === "JSXElement");
}

export function jsxHoldersIn(root: SourceNode): SourceNode[] {
	return nodesIn(root, (node) => node.type === "JSXElement" || node.type === "JSXFragment");
}

export function scopeOf(functions: readonly SourceNode[], node: SourceNode): number {
	const around = functions.filter((one) => one.start <= node.start && one.end >= node.end);
	return around.reduce((inner, one) => (one.start > inner ? one.start : inner), -1);
}

export function functionsIn(root: SourceNode): SourceNode[] {
	return nodesIn(root, (node) => FUNCTIONS.has(node.type));
}

export function withNodeMarks(source: string, file: string): string {
	const root = parsedSource(source);
	if (!root) return source;
	const sourceKey = sourceKeyOf(source);
	const children = new Set(jsxHoldersIn(root).flatMap(jsxChildrenOf));
	const functions = functionsIn(root);
	const marks = jsxElementsIn(root).flatMap((element) => {
		const opening = element["openingElement"];
		const name = isSourceNode(opening) ? opening["name"] : null;
		if (!isSourceNode(name)) return [];
		const held = children.has(element) ? "" : ` ${HELD_MARK}=""`;
		const scope = ` ${SCOPE_MARK}="${scopeOf(functions, element)}"`;
		return [
			{
				at: name.end,
				said: ` ${NODE_MARK}=${JSON.stringify(nodeMarkOf(file, sourceKey, element.start))}${held}${scope}`,
			},
		];
	});
	return marks
		.sort((a, b) => b.at - a.at)
		.reduce((text, { at, said }) => `${text.slice(0, at)}${said}${text.slice(at)}`, source);
}

export function jsxChildrenOf(holder: SourceNode): SourceNode[] {
	const children = holder["children"];
	return Array.isArray(children) ? children.filter(isSourceNode).filter((node) => node.type === "JSXElement") : [];
}

export function isSourceNode(held: unknown): held is SourceNode {
	return (
		typeof held === "object" &&
		held !== null &&
		typeof Reflect.get(held, "type") === "string" &&
		typeof Reflect.get(held, "start") === "number" &&
		typeof Reflect.get(held, "end") === "number"
	);
}

function nodesIn(root: SourceNode, isWanted: (node: SourceNode) => boolean): SourceNode[] {
	const found: SourceNode[] = [];
	walk(root, (node) => {
		if (isWanted(node)) found.push(node);
	});
	return found;
}

function walk(node: SourceNode, visit: (node: SourceNode) => void): void {
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === "loc" || key === "extra") continue;
		for (const child of Array.isArray(value) ? value : [value]) if (isSourceNode(child)) walk(child, visit);
	}
}
