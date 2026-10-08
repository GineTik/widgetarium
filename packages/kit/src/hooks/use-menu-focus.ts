import { useEffect } from "react";
import type { RefObject } from "react";
import type { FocusIntent, MenuState } from "../components/menu-context";
import { isInMenuTree } from "../components/menu-context";
import { focusQuietly, returnFocusTo } from "../utils/focus";
import { focusMenuItem } from "../utils/menu-keys";

const CLOSING_MENU = '.wg-kit-menu[data-state="closed"]';

export function useMenuFocus(menu: MenuState, panelRef: RefObject<HTMLElement | null>): void {
	useEffect(() => {
		const panel = panelRef.current;
		if (!menu.isOpen || !panel) return undefined;
		focusByIntent(panel, menu.focusIntent.current);
		menu.focusIntent.current = menu.parent ? "none" : "panel";
		return () => returnFocusFromMenu(menu, panel);
	}, [menu.isOpen]);
}

function focusByIntent(panel: HTMLElement, intent: FocusIntent): void {
	if (intent === "none") return;
	if (intent === "panel") {
		focusQuietly(panel);
		return;
	}
	focusMenuItem(panel, intent);
}

function returnFocusFromMenu(menu: MenuState, panel: HTMLElement): void {
	const active = document.activeElement;
	const isFocusInTree =
		active === null || active === document.body || panel.contains(active) || isInMenuTree(active, menu.treeId);
	const trigger = menu.triggerRef.current;
	if (!isFocusInTree || trigger?.closest(CLOSING_MENU)) return;
	returnFocusTo(trigger);
}
