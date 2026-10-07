import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ButtonSize } from "../utils/class-names";
import { cn } from "../utils/cn";
import { Button } from "./button";
import type { ButtonProps } from "./button";

export type InputGroupButtonSize = "xs" | "sm" | "icon-xs" | "icon-sm";

export interface InputGroupButtonProps extends Omit<ButtonProps, "size"> {
	readonly size?: InputGroupButtonSize | undefined;
}

const BUTTON_SIZE_OF: Readonly<Record<InputGroupButtonSize, ButtonSize>> = {
	xs: "sm",
	sm: "sm",
	"icon-xs": "icon-sm",
	"icon-sm": "icon-sm",
};

export function InputGroupButton({
	size = "xs",
	variant = "ghost",
	className,
	...rest
}: InputGroupButtonProps): ReactElement {
	return (
		<Button
			data-size={size}
			{...rest}
			variant={variant}
			size={BUTTON_SIZE_OF[size]}
			className={cn("wg-kit-input-group-button", size.endsWith("xs") && "is-xs", className)}
		/>
	);
}
