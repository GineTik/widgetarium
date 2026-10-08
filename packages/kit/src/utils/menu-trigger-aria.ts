import type { MenuState } from "../components/menu-context";

export interface MenuTriggerAria {
	readonly "aria-haspopup": "menu";
	readonly "aria-expanded": boolean;
	readonly "aria-controls": string | undefined;
}

export function menuTriggerAria(menu: MenuState): MenuTriggerAria {
	return {
		"aria-haspopup": "menu",
		"aria-expanded": menu.isOpen,
		"aria-controls": menu.isOpen ? menu.contentId : undefined,
	};
}
