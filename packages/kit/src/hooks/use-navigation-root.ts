import { useId, useRef, useState } from "react";
import { isInNavigation, activeTriggerOf } from "../components/navigation-menu-context";
import type { NavigationMenuState } from "../components/navigation-menu-context";
import { focusQuietly } from "../utils/focus";
import { useControllableState } from "./use-controllable-state";
import { useDelayed } from "./use-delayed";
import { useDismissLayer } from "./use-dismiss-layer";

export interface NavigationRootAsk {
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly openDelay: number;
	readonly isViewport: boolean;
}

export function useNavigationRoot(ask: NavigationRootAsk): NavigationMenuState {
	const [value, setValue] = useControllableState({
		prop: ask.value,
		defaultProp: ask.defaultValue ?? "",
		onChange: ask.onValueChange,
	});
	const lastOpen = useRef("");
	if (value !== "") lastOpen.current = value;
	const [viewportTarget, setViewportTarget] = useState<HTMLElement | null>(null);
	const nav: NavigationMenuState = {
		id: useId(),
		value,
		setValue,
		shownValue: value || lastOpen.current,
		rootRef: useRef<HTMLElement>(null),
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
