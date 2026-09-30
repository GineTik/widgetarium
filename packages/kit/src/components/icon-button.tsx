import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement, Ref } from "react";
import { iconButtonClass } from "../utils/class-names";
import type { IconButtonSize, IconButtonVariant } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { buttonMark } from "./button-mark";
import { Slot } from "./slot";
import { Slottable } from "./slottable";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean;
	readonly label?: string | undefined;
	readonly isLoading?: boolean;
	readonly isDone?: boolean;
	readonly variant?: IconButtonVariant | undefined;
	readonly size?: IconButtonSize | undefined;
	readonly ref?: Ref<HTMLButtonElement>;
}

export function IconButton({
	asChild = false,
	label,
	isLoading = false,
	isDone = false,
	children,
	...props
}: IconButtonProps): ReactElement {
	const Comp = asChild ? Slot : "button";
	const isDisabled = Boolean(props.disabled) || isLoading;
	return (
		<Comp
			type={asChild ? undefined : "button"}
			aria-label={label}
			{...domPropsOf(props)}
			disabled={isDisabled}
			aria-busy={isLoading ? "true" : undefined}
			data-loading={isLoading ? "" : undefined}
			data-disabled={isDisabled ? "" : undefined}
			className={cn(iconButtonClass(props), isLoading && "is-loading", isDone && "is-done")}
		>
			{buttonMark(isLoading, isDone, props.size) ?? <Slottable>{children}</Slottable>}
		</Comp>
	);
}
