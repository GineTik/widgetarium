import type { ViewHost } from "widgetarium";
import { useMarkdownRenderedInto } from "./use-markdown-rendered-into";

export function RenderedMarkdown({ host, markdown }: { host: ViewHost; markdown: string }) {
	const body = useMarkdownRenderedInto(host, markdown);
	return host.can.renderMarkdown ? (
		<div ref={body} className="flow-report-figure-drawn markdown-rendered" data-part="drawing" />
	) : (
		<pre className="flow-report-figure-plain">{markdown}</pre>
	);
}
