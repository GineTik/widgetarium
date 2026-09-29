import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { Slot } from "./slot";

export function PaginationButton({
	look,
	isActive = false,
	asChild = false,
	className: cls,
	children,
	...props
}: LooseProps) {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			type={asChild ? undefined : "button"}
			aria-current={isActive ? "page" : undefined}
			data-active={isActive ? "" : undefined}
			{...domPropsOf(props)}
			className={cn(look, "wg-kit-pagination-link", cls)}
		>
			{children}
		</Comp>
	);
}
