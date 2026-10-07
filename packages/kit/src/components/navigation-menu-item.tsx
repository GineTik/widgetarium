import { createElement as h, useId, useRef } from "react";
import type { LiHTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { NavigationItemContext } from "./navigation-menu-context";

export interface NavigationMenuItemProps extends LiHTMLAttributes<HTMLLIElement> {
	readonly value?: string | undefined;
}

export function NavigationMenuItem({ value, className, ...rest }: NavigationMenuItemProps): ReactElement {
	const generated = useId();
	const triggerRef = useRef<HTMLElement>(null);
	return (
		<NavigationItemContext.Provider value={{ value: value ?? generated, triggerRef }}>
			<li {...rest} data-slot="navigation-menu-item" className={cn("wg-kit-nav-item", className)} />
		</NavigationItemContext.Provider>
	);
}
