import type { ViewHost } from "widgetarium";
import { useMarkdownEmbeddedInto } from "./use-markdown-embedded-into";

export function Embedded({ markdown, host }: { markdown: string; host: ViewHost }) {
	const holder = useMarkdownEmbeddedInto(host, markdown);
	return <div className="wg-album-art" ref={holder} />;
}
