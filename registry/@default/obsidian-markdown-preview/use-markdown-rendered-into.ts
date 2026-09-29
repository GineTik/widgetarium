import { useLayoutEffect, useRef } from "react";
import type { ViewHost } from "widgetarium";

export function useMarkdownRenderedInto(host: ViewHost, markdown: string, path: string | null) {
	const body = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!body.current || !host.can.renderMarkdown) return undefined;
		return host.ui.renderMarkdown(body.current, markdown, path ?? undefined);
	}, [host, markdown, path]);

	return body;
}
