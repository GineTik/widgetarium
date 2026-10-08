import { createElement as h } from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, MouseEvent, ReactElement, Ref } from "react";
import { chainHandlers } from "../utils/chain";
import { toggleMenu } from "../utils/menu-trigger";
import { menuTriggerAria } from "../utils/menu-trigger-aria";
import type { MenuState } from "./menu-context";
import { useMenu } from "./menu-context";
import { dataStateOf } from "./popover-context";
import { buttonPartOf, composeRefs } from "./slot";

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
	const { part, type } = buttonPartOf(asChild);
	return h(part, {
		type,
		...menuTriggerAria(menu),
		"data-state": dataStateOf(menu.isOpen),
		...rest,
		"data-slot": "dropdown-menu-trigger",
		ref: composeRefs(menu.triggerRef, ref),
		onClick: chainHandlers(onClick, (event: MouseEvent<HTMLElement>) => toggleMenu(menu, event.detail === 0)),
		onKeyDown: chainHandlers(onKeyDown, (event: KeyboardEvent<HTMLElement>) => openOnVerticalArrow(menu, event)),
	});
}

function openOnVerticalArrow(menu: MenuState, event: KeyboardEvent<HTMLElement>): void {
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
	event.preventDefault();
	menu.focusIntent.current = event.key === "ArrowDown" ? "first" : "last";
	menu.setOpen(true);
}
