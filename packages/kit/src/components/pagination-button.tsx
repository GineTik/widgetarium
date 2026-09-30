import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { Slot } from "./slot";

export interface PaginationButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly look?: string | undefined;
	readonly isActive?: boolean;
	readonly asChild?: boolean;
	readonly ref?: Ref<HTMLButtonElement>;
}

export function PaginationButton({
	look,
	isActive = false,
	asChild = false,
	className: cls,
	children,
	...props
}: PaginationButtonProps): ReactElement {
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
