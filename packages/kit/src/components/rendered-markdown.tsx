import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useRendersMarkdownInto, type MarkdownHost } from "../hooks/use-renders-markdown-into";

export interface RenderedMarkdownProps {
	readonly host: MarkdownHost;
	readonly markdown: string;
	readonly path?: string | null | undefined;
	readonly className: string;
	readonly plainClassName?: string | undefined;
	readonly part?: string | undefined;
}

export function RenderedMarkdown({
	host,
	markdown,
	path = null,
	className,
	plainClassName,
	part,
}: RenderedMarkdownProps): ReactElement {
	const body = useRendersMarkdownInto(host, markdown, path);
	return host.can.renderMarkdown ? (
		<div ref={body} className={`${className} markdown-rendered`} data-part={part} />
	) : (
		<pre className={plainClassName ?? className}>{markdown}</pre>
	);
}
