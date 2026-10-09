import { createContext, useContext } from "react";
import type { Context, RefObject } from "react";
import type { Delayed } from "../hooks/use-delayed";

export interface NavigationMenuState {
	readonly id: string;
	readonly value: string;
	readonly setValue: (value: string) => void;
	readonly shownValue: string;
	readonly rootRef: RefObject<HTMLElement | null>;
	readonly openedByHover: RefObject<string>;
	readonly isViewport: boolean;
	readonly viewportTarget: HTMLElement | null;
	readonly setViewportTarget: (target: HTMLElement | null) => void;
	readonly delayed: Delayed;
	readonly openDelay: number;
}

export interface NavigationItemState {
	readonly value: string;
	readonly triggerRef: RefObject<HTMLElement | null>;
}

export const NavigationMenuContext: Context<NavigationMenuState | null> = createContext<NavigationMenuState | null>(
	null,
);

export const NavigationItemContext: Context<NavigationItemState | null> = createContext<NavigationItemState | null>(
	null,
);

export const NAVIGATION_ATTRIBUTE = "data-wg-nav";

export const NAVIGATION_VALUE_ATTRIBUTE = "data-wg-nav-value";

export function useNavigationMenu(): NavigationMenuState {
	const nav = useContext(NavigationMenuContext);
	if (!nav) throw new Error("a navigation menu part stands outside a NavigationMenu");
	return nav;
}

export function useNavigationItem(): NavigationItemState {
	const item = useContext(NavigationItemContext);
	if (!item) throw new Error("a navigation menu trigger or content stands outside a NavigationMenuItem");
	return item;
}

export function activeTriggerOf(nav: NavigationMenuState): HTMLElement | null {
	if (nav.shownValue === "") return null;
	return nav.rootRef.current?.querySelector<HTMLElement>(`[${NAVIGATION_VALUE_ATTRIBUTE}="${nav.shownValue}"]`) ?? null;
}

export function isInNavigation(node: Node, nav: NavigationMenuState): boolean {
	const element = node instanceof Element ? node : node.parentElement;
	return Boolean(nav.rootRef.current?.contains(node) || element?.closest(`[${NAVIGATION_ATTRIBUTE}="${nav.id}"]`));
}
