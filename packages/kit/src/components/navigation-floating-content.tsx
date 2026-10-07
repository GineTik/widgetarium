import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useFloatingLayer } from "../hooks/use-floating-layer";
import { boxOf } from "../utils/floating-placement";
import { FloatingPanel } from "./floating-panel";
import { NAVIGATION_ATTRIBUTE, useNavigationMenu } from "./navigation-menu-context";
import type { NavigationItemState } from "./navigation-menu-context";

export interface NavigationFloatingContentProps {
	readonly item: NavigationItemState;
	readonly children: ReactNode;
}

const BELOW_THE_TRIGGER = { side: "bottom", align: "start", sideOffset: 8, alignOffset: 0 } as const;

export function NavigationFloatingContent({ item, children }: NavigationFloatingContentProps): ReactElement | null {
	const nav = useNavigationMenu();
	const isOpen = nav.value === item.value;
	const { panelRef, isMounted } = useFloatingLayer({
		isOpen,
		anchorBox: boxOf(item.triggerRef),
		placement: BELOW_THE_TRIGGER,
	});
	if (!isMounted) return null;
	return (
		<FloatingPanel
			isOpen={isOpen}
			panelRef={panelRef}
			data-slot="navigation-menu-popup"
			className="wg-kit-nav-viewport"
			{...{ [NAVIGATION_ATTRIBUTE]: nav.id }}
		>
			{children}
		</FloatingPanel>
	);
}
