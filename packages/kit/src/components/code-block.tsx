import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";

export function CodeBlock({ code = "", label, className: cls, ...props }: LooseProps) {
	return (
		<pre {...domPropsOf(props)} className={cn("wg-kit-code-block", cls)} aria-label={label}>
			<code>{code}</code>
		</pre>
	);
}
