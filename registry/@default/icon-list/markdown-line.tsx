import type { ViewHost } from "widgetarium";
import { useMarkdownRenderedInto } from "./use-markdown-rendered-into";

export function MarkdownLine({ host, text }: { host: ViewHost; text: string }) {
	const body = useMarkdownRenderedInto(host, text);
	return host.can.renderMarkdown ? (
		<div ref={body} className="wg-icon-list-text markdown-rendered" />
	) : (
		<div className="wg-icon-list-text">{text}</div>
	);
}
