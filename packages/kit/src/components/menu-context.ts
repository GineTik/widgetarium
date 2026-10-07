import { createContext, useContext } from "react";
import type { Context, RefObject } from "react";
import type { AnchorBox } from "../constants/popover";

export type MenuFamily = "dropdown-menu" | "context-menu" | "menubar";

export type FocusIntent = "first" | "last" | "panel" | "none";

export interface MenuState {
	readonly family: MenuFamily;
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly closeTree: () => void;
	readonly treeId: string;
	readonly contentId: string;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly anchorBox: () => AnchorBox | null;
	readonly focusIntent: RefObject<FocusIntent>;
	readonly childCloser: RefObject<(() => void) | null>;
	readonly isInside: (node: Node) => boolean;
	readonly parent: MenuState | null;
}

export interface MenuRadio {
	readonly value: string | undefined;
	readonly setValue: (value: string) => void;
}

export const MenuContext: Context<MenuState | null> = createContext<MenuState | null>(null);

export const MenuRadioContext: Context<MenuRadio | null> = createContext<MenuRadio | null>(null);

export const MENU_TREE_ATTRIBUTE = "data-wg-menu-tree";

export function useMenu(): MenuState {
	const menu = useContext(MenuContext);
	if (!menu) throw new Error("a menu part stands outside a DropdownMenu, ContextMenu or MenubarMenu");
	return menu;
}

export function useMenuRadio(): MenuRadio {
	const radio = useContext(MenuRadioContext);
	if (!radio) throw new Error("a radio item stands outside a RadioGroup");
	return radio;
}

export function menuSlot(menu: MenuState, part: string): string {
	return `${menu.family}-${part}`;
}

export function isInMenuTree(node: Node, treeId: string): boolean {
	const element = node instanceof Element ? node : node.parentElement;
	return Boolean(element?.closest(`[${MENU_TREE_ATTRIBUTE}="${treeId}"]`));
}
