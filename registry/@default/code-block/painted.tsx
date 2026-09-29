import type { ViewHost } from "widgetarium";
import { useMarkdownPaintedInto } from "./use-markdown-painted-into";

export function Painted({ host, markdown }: { host: ViewHost; markdown: string }) {
	const node = useMarkdownPaintedInto(host, markdown);
	return <div className="wgc-body" ref={node} />;
}
