import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import type { RenderMarkdown } from "@widgetarium/core/engine/assistant-port.js";

export interface SaidParts {
	readonly settled: string;
	readonly tail: string;
}

export interface SaidProps {
	readonly text: string;
	readonly render: RenderMarkdown | null;
	readonly live: boolean;
}

const BLOCK_BREAK = "\n\n";
const FENCE = "```";

// TRADE-OFF: the block boundary is the whole test, so a half-written table or list renders as its own source until the blank line lands
export function settledPart(said: string): SaidParts {
	const fence = unclosedFenceAt(said);
	const breakAt = said.lastIndexOf(BLOCK_BREAK, fence === -1 ? said.length : fence);
	if (breakAt === -1) return { settled: "", tail: said };
	return { settled: said.slice(0, breakAt), tail: said.slice(breakAt + BLOCK_BREAK.length) };
}

export function Said({ text, render, live }: SaidProps): ReactElement {
	const { settled, tail } = render && live ? settledPart(text) : { settled: text, tail: "" };
	const holder = useRendersSettledMarkdown(render, settled);

	if (!render) return h("div", { className: "wg-studio-ai-said" }, text);
	return h("div", { className: "wg-studio-ai-said is-markdown" }, [
		h("div", { key: "settled", ref: holder }),
		tail === "" ? null : h("div", { className: "wg-studio-ai-tail", key: "tail" }, tail),
	]);
}

function useRendersSettledMarkdown(render: RenderMarkdown | null, settled: string): RefObject<HTMLDivElement | null> {
	const holder = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = holder.current;
		if (!node || !render || settled === "") return undefined;
		return render(node, settled);
	}, [settled, render]);
	return holder;
}

function unclosedFenceAt(said: string): number {
	let looked = -1;
	let opened = -1;
	for (;;) {
		const found = said.indexOf(FENCE, looked + 1);
		if (found === -1) return opened;
		opened = opened === -1 ? found : -1;
		looked = found;
	}
}
