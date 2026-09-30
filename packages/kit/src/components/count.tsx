import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../utils/cn";

export interface CountProps extends HTMLAttributes<HTMLSpanElement> {
	readonly ref?: Ref<HTMLSpanElement>;
}

export function Count({ children, ...rest }: CountProps): ReactElement {
	return (
		<span {...rest} className={cn("wg-kit-count", rest.className)}>
			{children}
		</span>
	);
}
