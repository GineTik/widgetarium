import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import type { ButtonGroupOrientation } from "./button-group";

export interface ButtonGroupSeparatorProps extends HTMLAttributes<HTMLDivElement> {
	readonly orientation?: ButtonGroupOrientation | undefined;
}

export function ButtonGroupSeparator({
	orientation = "vertical",
	className,
	...rest
}: ButtonGroupSeparatorProps): ReactElement {
	return (
		<div
			role="separator"
			aria-orientation={orientation}
			data-slot="button-group-separator"
			{...rest}
			data-orientation={orientation}
			className={cn("wg-kit-btn-group-separator", `is-${orientation}`, className)}
		/>
	);
}
