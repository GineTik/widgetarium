import type { ViewHost } from "widgetarium";
import { useEffect, useRef } from "react";

export function usePaintsMarkdownInto(host: ViewHost, markdown: string) {
	const node = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!node.current) return undefined;
		return host.ui.renderMarkdown(node.current, markdown);
	}, [markdown]);

	return node;
}
