import type { ViewHost } from "widgetarium";
import { useMarkdownRenderedInto } from "./use-markdown-rendered-into";

export function RenderedMarkdown({ host, markdown, path }: { host: ViewHost; markdown: string; path: string | null }) {
	const body = useMarkdownRenderedInto(host, markdown, path);
	return host.can.renderMarkdown ? (
		<div ref={body} className="wg-markdown-preview-body markdown-rendered" data-part="body" />
	) : (
		<pre className="wg-markdown-preview-plain">{markdown}</pre>
	);
}
