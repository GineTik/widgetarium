import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export { ButtonGroupText } from "./button-group-text";
export { ButtonGroupSeparator } from "./button-group-separator";
export type { ButtonGroupSeparatorProps } from "./button-group-separator";

export type ButtonGroupOrientation = "horizontal" | "vertical";

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
	readonly orientation?: ButtonGroupOrientation | undefined;
}

export function ButtonGroup({ orientation = "horizontal", className, ...rest }: ButtonGroupProps): ReactElement {
	return (
		<div
			role="group"
			data-slot="button-group"
			{...rest}
			data-orientation={orientation}
			className={cn("wg-kit-btn-group", `is-${orientation}`, className)}
		/>
	);
}
