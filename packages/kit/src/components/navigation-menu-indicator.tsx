import { createElement as h, useRef } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useIndicatorUnder } from "../hooks/use-indicator-under";
import { cn } from "../utils/cn";
import { useNavigationMenu } from "./navigation-menu-context";
import { dataStateOf } from "./popover-context";

export type NavigationMenuIndicatorProps = HTMLAttributes<HTMLDivElement>;

export function NavigationMenuIndicator({ className, ...rest }: NavigationMenuIndicatorProps): ReactElement {
	const nav = useNavigationMenu();
	const indicatorRef = useRef<HTMLDivElement>(null);
	useIndicatorUnder(indicatorRef, nav);
	return (
		<div
			aria-hidden="true"
			{...rest}
			ref={indicatorRef}
			data-slot="navigation-menu-indicator"
			data-state={dataStateOf(nav.value !== "")}
			className={cn("wg-kit-nav-indicator", className)}
		>
			<span className="wg-kit-nav-arrow" />
		</div>
	);
}
