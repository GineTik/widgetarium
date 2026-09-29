import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";

export function PaginationRoot({ className: cls, children, ...props }: LooseProps) {
	return (
		<nav aria-label="Pages" {...domPropsOf(props)} className={cn("wg-kit-pagination", cls)}>
			{children}
		</nav>
	);
}
