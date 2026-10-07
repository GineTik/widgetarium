import { createElement as h } from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, MouseEvent, ReactElement, Ref } from "react";
import { chain } from "../utils/chain";
import type { MenuState } from "./menu-context";
import { useMenu } from "./menu-context";
import { dataStateOf } from "./popover-context";
import { composeRefs, Slot } from "./slot";

export interface DropdownMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean;
	readonly ref?: Ref<HTMLElement>;
}

export function DropdownMenuTrigger({
	asChild = false,
	ref,
	onClick,
	onKeyDown,
	...rest
}: DropdownMenuTriggerProps): ReactElement {
	const menu = useMenu();
	return h(asChild ? Slot : "button", {
		type: asChild ? undefined : "button",
		"aria-haspopup": "menu",
		"aria-expanded": menu.isOpen,
		"aria-controls": menu.isOpen ? menu.contentId : undefined,
		"data-state": dataStateOf(menu.isOpen),
		...rest,
		"data-slot": "dropdown-menu-trigger",
		ref: composeRefs(menu.triggerRef, ref),
		onClick: chain(onClick, (event: MouseEvent<HTMLElement>) => toggleMenu(menu, event.detail === 0)),
		onKeyDown: chain(onKeyDown, (event: KeyboardEvent<HTMLElement>) => openOnArrow(menu, event)),
	});
}

function toggleMenu(menu: MenuState, isByKeyboard: boolean): void {
	menu.focusIntent.current = isByKeyboard ? "first" : "panel";
	if (menu.isOpen) menu.closeTree();
	else menu.setOpen(true);
}

function openOnArrow(menu: MenuState, event: KeyboardEvent<HTMLElement>): void {
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
	event.preventDefault();
	menu.focusIntent.current = event.key === "ArrowDown" ? "first" : "last";
	menu.setOpen(true);
}
