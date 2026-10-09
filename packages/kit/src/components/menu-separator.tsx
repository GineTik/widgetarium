import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { menuSlot, useMenu } from "./menu-context";

export type MenuSeparatorProps = HTMLAttributes<HTMLDivElement>;

export function MenuSeparator({ className, ...rest }: MenuSeparatorProps): ReactElement {
	const menu = useMenu();
	return (
		<div
			role="separator"
			aria-orientation="horizontal"
			{...rest}
			data-slot={menuSlot(menu, "separator")}
			className={cn("wg-kit-pop-sep", className)}
		/>
	);
}
