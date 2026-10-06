import { isSourceNode, jsxElementsIn, parsedSource } from "./node-marks.js";
import type { SourceNode } from "./node-marks.js";

export interface NodeMove {
	readonly from: number;
	readonly into: number;
	readonly before: number | null;
}

export type MovedSource = { readonly source: string } | { readonly refusal: string };

const NOT_PARSED = "the page's code does not parse, so nothing was moved";
const NOT_FOUND = "the element to move is no longer in the page's code";
const NO_PARENT = "the group to move into is no longer in the page's code";
const INTO_ITSELF = "an element cannot move into itself";
const SELF_CLOSING = "that element holds no children to move into";
const NO_SIBLING = "the element to stand before is not a child of that group";

export function movedNode(source: string, { from, into, before }: NodeMove): MovedSource {
	const root = parsedSource(source);
	if (!root) return { refusal: NOT_PARSED };
	const elements = jsxElementsIn(root);
	const moved = elements.find((node) => node.start === from);
	const parent = elements.find((node) => node.start === into);
	if (!moved) return { refusal: NOT_FOUND };
	if (!parent) return { refusal: NO_PARENT };
	if (parent.start >= moved.start && parent.end <= moved.end) return { refusal: INTO_ITSELF };
	const closing = parent["closingElement"];
	if (!isSourceNode(closing)) return { refusal: SELF_CLOSING };
	const sibling = before === null ? null : childrenOf(parent).find((node) => node.start === before);
	if (before !== null && !sibling) return { refusal: NO_SIBLING };
	return {
		source: movedText(
			source,
			moved,
			sibling ? lineStartOf(source, sibling.start) : lineStartOf(source, closing.start),
			sibling ? indentAt(source, sibling.start) : `${indentAt(source, closing.start)}\t`,
		),
	};
}

function movedText(source: string, moved: SourceNode, insertAt: number, indent: string): string {
	const cut = wholeLinesOf(source, moved);
	const block = reindented(source.slice(moved.start, moved.end), indentAt(source, moved.start), indent);
	const inserted = `${indent}${block}\n`;
	if (insertAt >= cut.end)
		return source.slice(0, cut.start) + source.slice(cut.end, insertAt) + inserted + source.slice(insertAt);
	return source.slice(0, insertAt) + inserted + source.slice(insertAt, cut.start) + source.slice(cut.end);
}

function childrenOf(parent: SourceNode): SourceNode[] {
	const children = parent["children"];
	return Array.isArray(children) ? children.filter(isSourceNode).filter((node) => node.type === "JSXElement") : [];
}

function wholeLinesOf(source: string, node: SourceNode): { readonly start: number; readonly end: number } {
	const lineStart = lineStartOf(source, node.start);
	const isAloneOnLine = source.slice(lineStart, node.start).trim() === "";
	const lineEnd = source.indexOf("\n", node.end);
	const isLineDone = source.slice(node.end, lineEnd === -1 ? source.length : lineEnd).trim() === "";
	if (!isAloneOnLine || !isLineDone) return { start: node.start, end: node.end };
	return { start: lineStart, end: lineEnd === -1 ? source.length : lineEnd + 1 };
}

function lineStartOf(source: string, at: number): number {
	return source.lastIndexOf("\n", at - 1) + 1;
}

function indentAt(source: string, at: number): string {
	const line = source.slice(lineStartOf(source, at), at);
	return /^\s*/.exec(line)?.[0] ?? "";
}

function reindented(block: string, was: string, now: string): string {
	return block
		.split("\n")
		.map((line, at) => (at === 0 || !line.startsWith(was) ? line : now + line.slice(was.length)))
		.join("\n");
}
