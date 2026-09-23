import { createElement as h } from "react";

const HEADING_LINE = /^#{1,6}\s/;

const INLINE =
	/(`[^`\n]*`)|(\[\[[^\]\n]*\]\])|(\[[^\]\n]*\]\([^)\n]*\))|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\*[^*\n]+\*|_[^_\n]+_)/g;

const INLINE_CLASSES = [null, "is-link", "is-link", "is-strong", "is-em"];

function markLine(line) {
	if (HEADING_LINE.test(line)) return [<span className="is-heading">{line}</span>];
	const parts = [];
	let at = 0;
	INLINE.lastIndex = 0;
	for (let found = INLINE.exec(line); found; found = INLINE.exec(line)) {
		if (found.index > at) parts.push(line.slice(at, found.index));
		const group = [1, 2, 3, 4, 5].find((index) => found[index] !== undefined);
		const styled = INLINE_CLASSES[group - 1];
		parts.push(styled ? <span className={styled}>{found[0]}</span> : found[0]);
		at = found.index + found[0].length;
	}
	if (at < line.length) parts.push(line.slice(at));
	return parts;
}

export function markdownSpans(text) {
	const out = [];
	String(text ?? "")
		.split("\n")
		.forEach((line, at) => {
			if (at > 0) out.push("\n");
			out.push(...markLine(line));
		});
	return out;
}
