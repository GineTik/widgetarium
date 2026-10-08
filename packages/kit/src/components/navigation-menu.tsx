import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { NAVIGATION_OPEN_MS } from "../constants/overlays";
import { useNavigationRoot } from "../hooks/use-navigation-root";
import { NavigationMenuContext } from "./navigation-menu-context";
import { NavigationMenuRoot } from "./navigation-menu-root";

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
	...rest
}: NavigationMenuProps): ReactElement {
	const nav = useNavigationRoot({ value, defaultValue, onValueChange, openDelay: delayDuration, isViewport: viewport });
	return (
		<NavigationMenuContext.Provider value={nav}>
			<NavigationMenuRoot {...rest} nav={nav} />
		</NavigationMenuContext.Provider>
	);
}
