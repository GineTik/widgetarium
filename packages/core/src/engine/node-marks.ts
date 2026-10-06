import { parse } from "@babel/parser";

export const NODE_MARK = "data-wg-node";
export const WIDGET_MARK = "data-wg-widget";

const PAGE_FOLDER = /-page$/;
const SOURCE_PLUGINS = ["jsx", "typescript"] as const;

export interface SourceNode {
	readonly type: string;
	readonly start: number;
	readonly end: number;
	readonly [key: string]: unknown;
}

export function isPageFolder(folder: string): boolean {
	return PAGE_FOLDER.test(folder);
}

export function nodeMarkOf(file: string, start: number): string {
	return `${file}:${start}`;
}

export function readNodeMark(mark: string): { readonly file: string; readonly start: number } | null {
	const at = mark.lastIndexOf(":");
	const start = Number(mark.slice(at + 1));
	if (at <= 0 || !Number.isInteger(start)) return null;
	return { file: mark.slice(0, at), start };
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
	const found: SourceNode[] = [];
	walk(root, (node) => {
		if (node.type === "JSXElement") found.push(node);
	});
	return found;
}

export function withNodeMarks(source: string, file: string): string {
	const root = parsedSource(source);
	if (!root) return source;
	const marks = jsxElementsIn(root).flatMap((element) => {
		const opening = element["openingElement"];
		const name = isSourceNode(opening) ? opening["name"] : null;
		return isSourceNode(name) ? [{ at: name.end, mark: nodeMarkOf(file, element.start) }] : [];
	});
	return marks
		.sort((a, b) => b.at - a.at)
		.reduce(
			(text, { at, mark }) => `${text.slice(0, at)} ${NODE_MARK}=${JSON.stringify(mark)}${text.slice(at)}`,
			source,
		);
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

function walk(node: SourceNode, visit: (node: SourceNode) => void): void {
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === "loc" || key === "extra") continue;
		for (const child of Array.isArray(value) ? value : [value]) if (isSourceNode(child)) walk(child, visit);
	}
}
