import { useEffect, useRef } from "react";
import type { RenderMarkdown } from "./types";

export function useDrawsMarkdownInto(render: RenderMarkdown | null, markdown: string) {
	const holder = useRef<HTMLSpanElement | null>(null);
	const renderRef = useRef<RenderMarkdown | null>(render);
	renderRef.current = render;

	useEffect(() => {
		const node = holder.current;
		const draw = renderRef.current;
		if (!node || !draw) return undefined;
		return draw(node, markdown);
	}, [markdown]);

	return holder;
}
