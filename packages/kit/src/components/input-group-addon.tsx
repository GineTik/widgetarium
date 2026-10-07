import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { focusControlOnPress } from "../utils/focus-on-press";

export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";

export interface InputGroupAddonProps extends HTMLAttributes<HTMLDivElement> {
	readonly align?: InputGroupAddonAlign | undefined;
}

const GROUP_CONTROL = "[data-slot='input-group-control']";

export function InputGroupAddon({ align = "inline-start", className, ...rest }: InputGroupAddonProps): ReactElement {
	return (
		<div
			role="group"
			data-slot="input-group-addon"
			{...rest}
			data-align={align}
			className={cn("wg-kit-input-group-addon", `is-${align}`, className)}
			onClick={(event) => {
				rest.onClick?.(event);
				focusControlOnPress(event, event.currentTarget.parentElement, GROUP_CONTROL);
			}}
		/>
	);
}
