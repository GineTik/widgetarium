import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";

export interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
	readonly code?: string;
	readonly label?: string | undefined;
}

export function CodeBlock({ code = "", label, ...props }: CodeBlockProps): ReactElement {
	return (
		<pre {...domPropsOf(props)} className={cn("wg-kit-code-block", props.className)} aria-label={label}>
			<code>{code}</code>
		</pre>
	);
}
