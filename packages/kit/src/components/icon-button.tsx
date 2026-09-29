import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { iconButtonClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { buttonMark } from "./button-mark";
import { Slot } from "./slot";
import { Slottable } from "./slottable";

export function IconButton({
	asChild = false,
	label,
	isLoading = false,
	isDone = false,
	children,
	...props
}: LooseProps) {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			type={asChild ? undefined : "button"}
			aria-label={label}
			{...domPropsOf(props)}
			disabled={props.disabled || isLoading}
			aria-busy={isLoading ? "true" : undefined}
			data-loading={isLoading ? "" : undefined}
			data-disabled={props.disabled || isLoading ? "" : undefined}
			className={cn(iconButtonClass(props), isLoading && "is-loading", isDone && "is-done")}
		>
			{buttonMark(isLoading, isDone, props.size) ?? <Slottable>{children}</Slottable>}
		</Comp>
	);
}
