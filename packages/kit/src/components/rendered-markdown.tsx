import { createElement as h } from "react";
import { useRendersMarkdownInto, type MarkdownHost } from "../hooks/use-renders-markdown-into";

type RenderedMarkdownProps = {
	host: MarkdownHost;
	markdown: string;
	path?: string | null;
	className: string;
	plainClassName?: string;
	part?: string;
};

export function RenderedMarkdown({
	host,
	markdown,
	path = null,
	className,
	plainClassName,
	part,
}: RenderedMarkdownProps) {
	const body = useRendersMarkdownInto(host, markdown, path);
	return host.can.renderMarkdown ? (
		<div ref={body} className={`${className} markdown-rendered`} data-part={part} />
	) : (
		<pre className={plainClassName ?? className}>{markdown}</pre>
	);
}
