import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { rowClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { Slot } from "./slot";

export interface SidebarMenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean;
	readonly isActive?: boolean | undefined;
	readonly size?: "default" | "sm" | "lg" | undefined;
	readonly variant?: "default" | "outline" | undefined;
	readonly tooltip?: ReactNode;
}

export function SidebarMenuButton({
	asChild = false,
	isActive = false,
	size = "default",
	variant = "default",
	tooltip,
	className,
	...rest
}: SidebarMenuButtonProps): ReactElement {
	return h(asChild ? Slot : "button", {
		type: asChild ? undefined : "button",
		title: typeof tooltip === "string" ? tooltip : undefined,
		"data-slot": "sidebar-menu-button",
		"data-size": size,
		"data-active": isActive,
		"aria-current": isActive ? "page" : undefined,
		...rest,
		className: cn(
			rowClass({ pressable: true }),
			"wg-kit-side-row",
			"wg-kit-side-menu-button",
			size !== "default" && `is-${size}`,
			variant === "outline" && "is-outline",
			isActive && "is-selected",
			className,
		),
	});
}
