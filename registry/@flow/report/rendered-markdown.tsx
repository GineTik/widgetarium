import type { ViewHost } from "widgetarium";
import { useMarkdownRenderedInto } from "./use-markdown-rendered-into";

export function RenderedMarkdown({ host, markdown, path }: { host: ViewHost; markdown: string; path: string | null }) {
	const body = useMarkdownRenderedInto(host, markdown, path);
	return host.can.renderMarkdown ? (
		<div ref={body} className="flow-report-prose markdown-rendered" data-part="prose" />
	) : (
		<pre className="flow-report-plain">{markdown}</pre>
	);
}
