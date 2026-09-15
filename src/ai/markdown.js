import { createElement as h, useEffect, useRef } from "react";

const BLOCK_BREAK = "\n\n";
const FENCE = "```";

export function canRenderMarkdown(host) {
	return host?.can?.renderMarkdown === true && typeof host.ui?.renderMarkdown === "function";
}

function unclosedFenceAt(said) {
	let looked = -1;
	let opened = -1;
	for (;;) {
		const found = said.indexOf(FENCE, looked + 1);
		if (found === -1) return opened;
		opened = opened === -1 ? found : -1;
		looked = found;
	}
}

// TRADE-OFF: the block boundary is the whole test, so a half-written table or list renders as its own source until the blank line lands
export function settledPart(text) {
	const said = String(text ?? "");
	const fence = unclosedFenceAt(said);
	const breakAt = said.lastIndexOf(BLOCK_BREAK, fence === -1 ? said.length : fence);
	if (breakAt === -1) return { settled: "", tail: said };
	return { settled: said.slice(0, breakAt), tail: said.slice(breakAt + BLOCK_BREAK.length) };
}

export function Said({ text, host, live }) {
	const holder = useRef(null);
	const renders = canRenderMarkdown(host);
	const { settled, tail } = renders && live ? settledPart(text) : { settled: text, tail: "" };

	useEffect(() => {
		const node = holder.current;
		if (!node || !renders || settled === "") return undefined;
		return host.ui.renderMarkdown(node, settled);
	}, [settled, host, renders]);

	if (!renders) return h("div", { className: "wg-ai-said" }, text);
	return h("div", { className: "wg-ai-said is-markdown" }, [
		h("div", { key: "settled", ref: holder }),
		tail === "" ? null : h("div", { className: "wg-ai-tail", key: "tail" }, tail),
	]);
}
