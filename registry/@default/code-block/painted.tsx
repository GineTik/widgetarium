import type { ViewHost } from "widgetarium";
import { usePaintsMarkdownInto } from "./use-paints-markdown-into";

export function Painted({ host, markdown }: { host: ViewHost; markdown: string }) {
	const node = usePaintsMarkdownInto(host, markdown);
	return <div className="wgc-body" ref={node} />;
}
