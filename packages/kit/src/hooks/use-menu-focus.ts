import { useEffect } from "react";
import type { RefObject } from "react";
import type { FocusIntent, MenuState } from "../components/menu-context";
import { isInMenuTree } from "../components/menu-context";
import { focusQuietly } from "../utils/focus";
import { focusMenuItem } from "../utils/menu-keys";

export function useMenuFocus(menu: MenuState, panelRef: RefObject<HTMLElement | null>): void {
	useEffect(() => {
		const panel = panelRef.current;
		if (!menu.isOpen || !panel) return undefined;
		focusByIntent(panel, menu.focusIntent.current);
		menu.focusIntent.current = menu.parent ? "none" : "panel";
		return () => returnFocus(menu, panel);
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

function returnFocus(menu: MenuState, panel: HTMLElement): void {
	if (shouldReturnFocus(menu, panel)) focusQuietly(menu.triggerRef.current);
}

function shouldReturnFocus(menu: MenuState, panel: HTMLElement): boolean {
	const active = document.activeElement;
	if (active === null || active === document.body || panel.contains(active)) return true;
	return menu.parent === null && isInMenuTree(active, menu.treeId);
}
