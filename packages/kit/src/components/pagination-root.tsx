import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";

export interface PaginationRootProps extends HTMLAttributes<HTMLElement> {
	readonly "data-variant"?: string | undefined;
}

export function PaginationRoot({ children, ...props }: PaginationRootProps): ReactElement {
	return (
		<nav aria-label="Pages" {...domPropsOf(props)} className={cn("wg-kit-pagination", props.className)}>
			{children}
		</nav>
	);
}
