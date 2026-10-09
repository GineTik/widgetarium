import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { HOVER_GRACE_MS } from "../constants/overlays";
import { chainHandlers } from "../utils/chain";
import { cn } from "../utils/cn";
import { useNavigationItem, useNavigationMenu } from "./navigation-menu-context";
import { NavigationContentContext } from "./navigation-content-context";
import { NavigationFloatingContent } from "./navigation-floating-content";
import { NavigationViewportPortal } from "./navigation-viewport-portal";
import { dataStateOf } from "./popover-context";

export type NavigationMenuContentProps = HTMLAttributes<HTMLDivElement>;

export function NavigationMenuContent({
	className,
	onPointerEnter,
	onPointerLeave,
	...rest
}: NavigationMenuContentProps): ReactElement {
	const nav = useNavigationMenu();
	const item = useNavigationItem();
	const body = (
		<NavigationContentContext.Provider value={true}>
			<div
				{...rest}
				data-slot="navigation-menu-content"
				data-state={dataStateOf(nav.value === item.value)}
				className={cn("wg-kit-nav-content", className)}
				onPointerEnter={chainHandlers(onPointerEnter, () => nav.delayed.stop())}
				onPointerLeave={chainHandlers(onPointerLeave, () => nav.delayed.start(() => nav.setValue(""), HOVER_GRACE_MS))}
			/>
		</NavigationContentContext.Provider>
	);
	if (nav.isViewport) return <NavigationViewportPortal isShown={nav.shownValue === item.value} content={body} />;
	return <NavigationFloatingContent item={item}>{body}</NavigationFloatingContent>;
}
