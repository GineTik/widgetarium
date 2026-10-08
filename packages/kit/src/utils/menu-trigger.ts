import type { MenuState } from "../components/menu-context";

export function toggleMenu(menu: MenuState, isByKeyboard: boolean): void {
	menu.focusIntent.current = isByKeyboard ? "first" : "panel";
	if (menu.isOpen) menu.closeTree();
	else menu.setOpen(true);
}
