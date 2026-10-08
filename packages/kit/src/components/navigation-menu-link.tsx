import { createElement as h } from "react";
import type { AnchorHTMLAttributes, MouseEvent, ReactElement } from "react";
import { chainHandlers } from "../utils/chain";
import { cn } from "../utils/cn";
import { useNavigationMenu } from "./navigation-menu-context";
import { Slot } from "./slot";

export interface NavigationMenuLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onSelect"> {
	readonly asChild?: boolean;
	readonly active?: boolean | undefined;
	readonly onSelect?: ((event: Event) => void) | undefined;
}

export function NavigationMenuLink({
	asChild = false,
	active,
	onSelect,
	onClick,
	className,
	...rest
}: NavigationMenuLinkProps): ReactElement {
	const nav = useNavigationMenu();
	return h(asChild ? Slot : "a", {
		...rest,
		"data-slot": "navigation-menu-link",
		"data-active": active ? "" : undefined,
		"aria-current": active ? "page" : undefined,
		className: cn("wg-kit-nav-link", className),
		onClick: chainHandlers(onClick, (event: MouseEvent<HTMLElement>) => {
			const select = new Event("select", { cancelable: true });
			onSelect?.(select);
			if (select.defaultPrevented) event.preventDefault();
			else nav.setValue("");
		}),
	});
}
