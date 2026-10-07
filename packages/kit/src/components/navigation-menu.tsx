import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { NAVIGATION_OPEN_MS } from "../constants/overlays";
import { useNavigationRoot } from "../hooks/use-navigation-root";
import { cn } from "../utils/cn";
import { NavigationMenuContext } from "./navigation-menu-context";
import { NavigationMenuViewport } from "./navigation-menu-viewport";

export { NavigationMenuList } from "./navigation-menu-list";
export { NavigationMenuItem } from "./navigation-menu-item";
export { NavigationMenuTrigger } from "./navigation-menu-trigger";
export { NavigationMenuContent } from "./navigation-menu-content";
export { NavigationMenuLink } from "./navigation-menu-link";
export { NavigationMenuIndicator } from "./navigation-menu-indicator";
export { NavigationMenuViewport } from "./navigation-menu-viewport";
export { navigationMenuTriggerStyle } from "../utils/navigation-menu";

export interface NavigationMenuProps extends Omit<HTMLAttributes<HTMLElement>, "defaultValue"> {
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly delayDuration?: number | undefined;
	readonly viewport?: boolean | undefined;
}

export function NavigationMenu({
	value,
	defaultValue,
	onValueChange,
	delayDuration = NAVIGATION_OPEN_MS,
	viewport = true,
	className,
	children,
	...rest
}: NavigationMenuProps): ReactElement {
	const nav = useNavigationRoot({ value, defaultValue, onValueChange, openDelay: delayDuration, isViewport: viewport });
	return (
		<NavigationMenuContext.Provider value={nav}>
			<nav
				{...rest}
				ref={(node: HTMLElement | null) => {
					nav.rootRef.current = node;
				}}
				data-slot="navigation-menu"
				data-viewport={viewport}
				className={cn("wg-kit-nav", className)}
			>
				{children}
				{viewport ? <NavigationMenuViewport /> : null}
			</nav>
		</NavigationMenuContext.Provider>
	);
}
