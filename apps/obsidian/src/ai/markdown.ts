import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement, RefObject } from "react";

type RenderMarkdown = (element: HTMLElement, markdown: string) => () => void;

export interface MarkdownHost {
	readonly can?: { readonly renderMarkdown?: boolean } | null;
	readonly ui?: { readonly renderMarkdown?: RenderMarkdown } | null;
}

interface RenderingHost {
	readonly ui: { readonly renderMarkdown: RenderMarkdown };
}

export interface SaidParts {
	readonly settled: string;
	readonly tail: string;
}

export interface SaidProps {
	readonly text: string;
	readonly host: MarkdownHost | null | undefined;
	readonly live: boolean;
}

const BLOCK_BREAK = "\n\n";
const FENCE = "```";

export function canRenderMarkdown(host: MarkdownHost | null | undefined): host is MarkdownHost & RenderingHost {
	return host?.can?.renderMarkdown === true && typeof host.ui?.renderMarkdown === "function";
}

// TRADE-OFF: the block boundary is the whole test, so a half-written table or list renders as its own source until the blank line lands
export function settledPart(text: unknown): SaidParts {
	const said = String(text ?? "");
	const fence = unclosedFenceAt(said);
	const breakAt = said.lastIndexOf(BLOCK_BREAK, fence === -1 ? said.length : fence);
	if (breakAt === -1) return { settled: "", tail: said };
	return { settled: said.slice(0, breakAt), tail: said.slice(breakAt + BLOCK_BREAK.length) };
}

export function Said({ text, host, live }: SaidProps): ReactElement {
	const renders = canRenderMarkdown(host);
	const { settled, tail } = renders && live ? settledPart(text) : { settled: text, tail: "" };
	const holder = useRendersSettledMarkdown(host, settled);

	if (!renders) return h("div", { className: "wg-ai-said" }, text);
	return h("div", { className: "wg-ai-said is-markdown" }, [
		h("div", { key: "settled", ref: holder }),
		tail === "" ? null : h("div", { className: "wg-ai-tail", key: "tail" }, tail),
	]);
}

function useRendersSettledMarkdown(
	host: MarkdownHost | null | undefined,
	settled: string,
): RefObject<HTMLDivElement | null> {
	const holder = useRef<HTMLDivElement>(null);
	const renders = canRenderMarkdown(host);
	useEffect(() => {
		const node = holder.current;
		if (!node || !canRenderMarkdown(host) || settled === "") return undefined;
		return host.ui.renderMarkdown(node, settled);
	}, [settled, host, renders]);
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
