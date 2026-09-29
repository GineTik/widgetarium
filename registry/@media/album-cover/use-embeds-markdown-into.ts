import { useEffect, useRef } from "react";
import type { ViewHost } from "widgetarium";

export function useEmbedsMarkdownInto(host: ViewHost, markdown: string) {
	const holder = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const node = holder.current;
		if (!node) return undefined;
		return host.ui.renderMarkdown(node, markdown);
	}, [host, markdown]);

	return holder;
}
