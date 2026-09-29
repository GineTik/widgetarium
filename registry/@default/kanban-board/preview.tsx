import type { RenderMarkdown } from "./types";
import { useMarkdownWithCopyButtons } from "./use-markdown-with-copy-buttons";

export function Preview({ markdown, render }: { markdown: string; render?: RenderMarkdown | undefined }) {
	const holder = useMarkdownWithCopyButtons(markdown, render);
	return <div className="otd-md" ref={holder} />;
}
