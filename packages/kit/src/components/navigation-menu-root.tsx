import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import type { NavigationMenuState } from "./navigation-menu-context";
import { NavigationMenuViewport } from "./navigation-menu-viewport";
import { composeRefs } from "./slot";

export interface NavigationMenuRootProps extends HTMLAttributes<HTMLElement> {
	readonly nav: NavigationMenuState;
}

export function NavigationMenuRoot({ nav, className, children, ...rest }: NavigationMenuRootProps): ReactElement {
	return (
		<nav
			{...rest}
			ref={composeRefs(nav.rootRef)}
			data-slot="navigation-menu"
			data-viewport={nav.isViewport}
			className={cn("wg-kit-nav", className)}
		>
			{children}
			{nav.isViewport ? <NavigationMenuViewport /> : null}
		</nav>
	);
}
