import type { ViewHost } from "widgetarium";
import { useRendersMarkdownInto } from "widgetarium/kit";

export function MarkdownLine({ host, text }: { host: ViewHost; text: string }) {
	const body = useRendersMarkdownInto(host, text);
	return host.can.renderMarkdown ? (
		<div ref={body} className="wg-icon-list-text markdown-rendered" />
	) : (
		<div className="wg-icon-list-text">{text}</div>
	);
}
