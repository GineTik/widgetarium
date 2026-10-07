import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useFloatingLayer } from "../hooks/use-floating-layer";
import { useMorphingSize } from "../hooks/use-morphing-size";
import { boxOf } from "../utils/floating-placement";
import { cn } from "../utils/cn";
import { FloatingPanel } from "./floating-panel";
import { NAVIGATION_ATTRIBUTE, useNavigationMenu } from "./navigation-menu-context";

export type NavigationMenuViewportProps = HTMLAttributes<HTMLDivElement>;

const BELOW_THE_MENU = { side: "bottom", align: "start", sideOffset: 8, alignOffset: 0 } as const;

export function NavigationMenuViewport({ className, ...rest }: NavigationMenuViewportProps): ReactElement | null {
	const nav = useNavigationMenu();
	const isOpen = nav.value !== "";
	const { panelRef, isMounted } = useFloatingLayer({
		isOpen,
		anchorBox: boxOf(nav.rootRef),
		placement: BELOW_THE_MENU,
	});
	useMorphingSize(panelRef, nav.viewportTarget, nav.shownValue);
	if (!isMounted) return null;
	return (
		<FloatingPanel
			{...rest}
			{...{ [NAVIGATION_ATTRIBUTE]: nav.id }}
			isOpen={isOpen}
			panelRef={panelRef}
			data-slot="navigation-menu-viewport"
			className={cn("wg-kit-nav-viewport", className)}
		>
			<div className="wg-kit-nav-viewport-inner" ref={nav.setViewportTarget} />
		</FloatingPanel>
	);
}
