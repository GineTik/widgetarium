import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

export type MarkdownHost = {
	can: { renderMarkdown: boolean };
	ui: { renderMarkdown(element: HTMLElement, markdown: string, sourcePath?: string): () => void };
};

export function useRendersMarkdownInto(
	host: MarkdownHost,
	markdown: string,
	path: string | null = null,
): RefObject<HTMLDivElement | null> {
	const body = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!body.current || !host.can.renderMarkdown) return undefined;
		return host.ui.renderMarkdown(body.current, markdown, path ?? undefined);
	}, [host, markdown, path]);

	return body;
}
