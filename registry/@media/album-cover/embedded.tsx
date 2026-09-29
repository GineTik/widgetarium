import type { ViewHost } from "widgetarium";
import { useEmbedsMarkdownInto } from "./use-embeds-markdown-into";

export function Embedded({ markdown, host }: { markdown: string; host: ViewHost }) {
	const holder = useEmbedsMarkdownInto(host, markdown);
	return <div className="wg-album-art" ref={holder} />;
}
