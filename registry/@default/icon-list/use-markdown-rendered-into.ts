import { useLayoutEffect, useRef } from "react";
import type { ViewHost } from "widgetarium";

export function useMarkdownRenderedInto(host: ViewHost, text: string) {
	const body = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!body.current || !host.can.renderMarkdown) return undefined;
		return host.ui.renderMarkdown(body.current, text);
	}, [host, text]);

	return body;
}
