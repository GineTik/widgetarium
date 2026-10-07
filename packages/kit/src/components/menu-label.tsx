import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { menuSlot, useMenu } from "./menu-context";

export interface MenuLabelProps extends HTMLAttributes<HTMLDivElement> {
	readonly inset?: boolean | undefined;
}

export function MenuLabel({ inset, className, ...rest }: MenuLabelProps): ReactElement {
	const menu = useMenu();
	return (
		<div
			{...rest}
			data-slot={menuSlot(menu, "label")}
			data-inset={inset ? "" : undefined}
			className={cn("wg-kit-menu-label", className)}
		/>
	);
}
