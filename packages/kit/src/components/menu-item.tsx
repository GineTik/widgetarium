import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { menuItemHandlers, menuItemMarks } from "../utils/menu-item";
import { useMenu } from "./menu-context";
import { Slot } from "./slot";

export type MenuItemVariant = "default" | "destructive";

export interface MenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
	readonly asChild?: boolean;
	readonly inset?: boolean | undefined;
	readonly variant?: MenuItemVariant | undefined;
	readonly disabled?: boolean | undefined;
	readonly textValue?: string | undefined;
	readonly onSelect?: ((event: Event) => void) | undefined;
}

export function MenuItem({
	asChild = false,
	inset,
	variant = "default",
	disabled,
	textValue,
	onSelect,
	className,
	...rest
}: MenuItemProps): ReactElement {
	const menu = useMenu();
	return h(asChild ? Slot : "div", {
		role: "menuitem",
		...rest,
		...menuItemMarks(menu, { part: "item", inset, disabled }),
		...menuItemHandlers(menu, { disabled, onSelect, theirs: rest }),
		"data-variant": variant,
		"data-text-value": textValue,
		className: cn("wg-kit-menu-item", className),
	});
}
