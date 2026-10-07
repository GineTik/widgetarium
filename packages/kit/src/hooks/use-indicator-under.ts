import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { activeTriggerOf } from "../components/navigation-menu-context";
import type { NavigationMenuState } from "../components/navigation-menu-context";

export function useIndicatorUnder(indicatorRef: RefObject<HTMLElement | null>, nav: NavigationMenuState): void {
	useLayoutEffect(() => {
		const indicator = indicatorRef.current;
		const trigger = activeTriggerOf(nav);
		const ground = indicator?.offsetParent;
		if (!indicator || !trigger || !ground) return;
		const triggerBox = trigger.getBoundingClientRect();
		const left = triggerBox.left - ground.getBoundingClientRect().left;
		indicator.style.setProperty("--wg-kit-nav-indicator-x", `${Math.round(left)}px`);
		indicator.style.setProperty("--wg-kit-nav-indicator-width", `${Math.round(triggerBox.width)}px`);
	}, [nav.shownValue]);
}
