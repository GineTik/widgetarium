export interface SplitSheet {
	readonly app: string;
	readonly studio: string;
}

interface Block {
	readonly prelude: string;
	readonly body: string | null;
}

const STUDIO_CLASS = /\.wg-studio/;
const NESTING_AT_RULE = /^@(?:media|supports|container|layer)\b/;
const COMMENT = /\/\*[\s\S]*?\*\//g;
const QUOTES = new Set(['"', "'"]);

export function studioSplitOf(css: string): SplitSheet {
	const parts = blocksOf(css).map(splitBlock);
	return { app: parts.map((part) => part.app).join(""), studio: parts.map((part) => part.studio).join("") };
}

function splitBlock(block: Block): SplitSheet {
	if (block.body === null) return { app: block.prelude, studio: "" };
	const opening = block.prelude.replace(COMMENT, "").trim();
	if (NESTING_AT_RULE.test(opening)) return splitNested(block.prelude, block.body);
	if (opening.startsWith("@")) return { app: `${block.prelude}{${block.body}}`, studio: "" };
	return splitRule(block.prelude, block.body);
}

function splitNested(prelude: string, body: string): SplitSheet {
	const inner = studioSplitOf(body);
	return {
		app: inner.app.trim() === "" ? "" : `${prelude}{${inner.app}}`,
		studio: inner.studio.trim() === "" ? "" : `${prelude.trim()} {${inner.studio}\n}\n\n`,
	};
}

function splitRule(prelude: string, body: string): SplitSheet {
	const selectors = splitAtTopCommas(prelude.replace(COMMENT, "")).map((one) => one.trim());
	const studio = selectors.filter((one) => STUDIO_CLASS.test(one));
	if (studio.length === 0) return { app: `${prelude}{${body}}`, studio: "" };
	const app = selectors.filter((one) => !STUDIO_CLASS.test(one));
	return {
		app: app.length === 0 ? "" : `\n\n${app.join(",\n")} {${body}}`,
		studio: `${studio.join(",\n")} {${body}}\n\n`,
	};
}

function blocksOf(css: string): Block[] {
	const blocks: Block[] = [];
	let from = 0;
	let at = 0;
	while (at < css.length) {
		const skipped = skippedFrom(css, at);
		if (skipped > at) at = skipped;
		else if (css[at] === "{") {
			const closing = closingOf(css, at);
			blocks.push({ prelude: css.slice(from, at), body: css.slice(at + 1, closing) });
			from = at = closing + 1;
		} else if (css[at] === ";") {
			blocks.push({ prelude: css.slice(from, at + 1), body: null });
			from = at = at + 1;
		} else at += 1;
	}
	return from < css.length ? [...blocks, { prelude: css.slice(from), body: null }] : blocks;
}

function closingOf(css: string, opening: number): number {
	let depth = 0;
	for (let at = opening; at < css.length;) {
		const skipped = skippedFrom(css, at);
		if (skipped > at) {
			at = skipped;
			continue;
		}
		if (css[at] === "{") depth += 1;
		if (css[at] === "}" && (depth -= 1) === 0) return at;
		at += 1;
	}
	throw new Error(`a block opened at ${opening} never closes`);
}

function splitAtTopCommas(selectorList: string): string[] {
	const selectors: string[] = [];
	let depth = 0;
	let from = 0;
	for (let at = 0; at < selectorList.length;) {
		const skipped = skippedFrom(selectorList, at);
		if (skipped > at) {
			at = skipped;
			continue;
		}
		const char = selectorList[at];
		if (char === "(" || char === "[") depth += 1;
		if (char === ")" || char === "]") depth -= 1;
		if (char === "," && depth === 0) {
			selectors.push(selectorList.slice(from, at));
			from = at + 1;
		}
		at += 1;
	}
	return [...selectors, selectorList.slice(from)];
}

function skippedFrom(css: string, at: number): number {
	if (css.startsWith("/*", at)) return commentEndFrom(css, at);
	const quote = css[at];
	if (quote === undefined || !QUOTES.has(quote)) return at;
	let end = at + 1;
	while (end < css.length && css[end] !== quote) end += css[end] === "\\" ? 2 : 1;
	return end + 1;
}

function commentEndFrom(css: string, at: number): number {
	const closing = css.indexOf("*/", at + 2);
	return closing === -1 ? css.length : closing + 2;
}
