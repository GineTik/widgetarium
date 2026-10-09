import { useId, useRef, useState } from "react";
import { isInNavigation, activeTriggerOf } from "../components/navigation-menu-context";
import type { NavigationMenuState } from "../components/navigation-menu-context";
import { focusQuietly } from "../utils/focus";
import { useDelayed } from "./use-delayed";
import { useDismissLayer } from "./use-dismiss-layer";
import { useNavigationValue } from "./use-navigation-value";
import type { NavigationValueAsk } from "./use-navigation-value";

export interface NavigationRootAsk extends NavigationValueAsk {
	readonly openDelay: number;
	readonly isViewport: boolean;
}

export function useNavigationRoot(ask: NavigationRootAsk): NavigationMenuState {
	const [viewportTarget, setViewportTarget] = useState<HTMLElement | null>(null);
	const nav: NavigationMenuState = {
		...useNavigationValue(ask),
		id: useId(),
		rootRef: useRef<HTMLElement>(null),
		openedByHover: useRef(""),
		isViewport: ask.isViewport,
		viewportTarget,
		setViewportTarget,
		delayed: useDelayed(),
		openDelay: ask.openDelay,
	};
	useNavigationDismiss(nav);
	return nav;
}

function useNavigationDismiss(nav: NavigationMenuState): void {
	const close = (): void => {
		nav.delayed.stop();
		nav.setValue("");
	};
	useDismissLayer({
		isOpen: nav.value !== "",
		holds: (node) => isInNavigation(node, nav),
		onEscape: () => {
			focusQuietly(activeTriggerOf(nav));
			close();
		},
		onOutsidePress: close,
	});
}
