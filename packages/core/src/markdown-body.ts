import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import type { ViewHost } from "./gateway/host.js";

export interface MarkdownHost {
	readonly can?: Partial<ViewHost["can"]> | undefined;
	readonly ui?: Pick<ViewHost["ui"], "renderMarkdown"> | undefined;
}

export interface MarkdownBodyProps {
	readonly body: string;
	readonly host: MarkdownHost | null | undefined;
}

export function MarkdownBody({ body, host }: MarkdownBodyProps): ReactElement {
	const holder = useRendersMarkdown(body, host);
	if (!rendersMarkdown(host)) return h("pre", { className: "wg-doc-plain" }, body);
	return h("div", { className: "wg-doc-body", ref: holder });
}

function useRendersMarkdown(body: string, host: MarkdownHost | null | undefined): RefObject<HTMLDivElement | null> {
	const holder = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const node = holder.current;
		const ui = host?.ui;
		if (!node || !ui || !rendersMarkdown(host)) return undefined;
		return ui.renderMarkdown(node, body);
	}, [body, host]);
	return holder;
}

function rendersMarkdown(host: MarkdownHost | null | undefined): boolean {
	return host?.can?.renderMarkdown === true;
}
