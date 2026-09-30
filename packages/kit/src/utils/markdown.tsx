import { createElement as h } from "react";
import type { ReactNode } from "react";

const HEADING_LINE = /^#{1,6}\s/;

const INLINE =
	/(`[^`\n]*`)|(\[\[[^\]\n]*\]\])|(\[[^\]\n]*\]\([^)\n]*\))|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\*[^*\n]+\*|_[^_\n]+_)/g;

const INLINE_CLASSES: readonly (string | null)[] = [null, "is-link", "is-link", "is-strong", "is-em"];

const INLINE_GROUPS = [1, 2, 3, 4, 5];

export function markdownSpans(text: unknown): ReactNode[] {
	const out: ReactNode[] = [];
	String(text ?? "")
		.split("\n")
		.forEach((line, at) => {
			if (at > 0) out.push("\n");
			out.push(...markLine(line));
		});
	return out;
}

function markLine(line: string): ReactNode[] {
	if (HEADING_LINE.test(line)) return [<span className="is-heading">{line}</span>];
	const parts: ReactNode[] = [];
	let at = 0;
	INLINE.lastIndex = 0;
	for (let found = INLINE.exec(line); found; found = INLINE.exec(line)) {
		if (found.index > at) parts.push(line.slice(at, found.index));
		parts.push(inlinePart(found));
		at = found.index + found[0].length;
	}
	if (at < line.length) parts.push(line.slice(at));
	return parts;
}

function inlinePart(found: RegExpExecArray): ReactNode {
	const group = INLINE_GROUPS.find((index) => found[index] !== undefined) ?? 1;
	const styled = INLINE_CLASSES[group - 1];
	return styled ? <span className={styled}>{found[0]}</span> : found[0];
}
