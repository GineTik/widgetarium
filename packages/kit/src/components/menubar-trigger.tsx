import { createElement as h, useContext } from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, MouseEvent, PointerEvent, ReactElement } from "react";
import { chain } from "../utils/chain";
import { cn } from "../utils/cn";
import { focusQuietly } from "../utils/focus";
import { toggleMenu } from "../utils/menu-trigger";
import type { MenuState } from "./menu-context";
import { useMenu } from "./menu-context";
import { MENUBAR_VALUE_ATTRIBUTE, MenubarValueContext, useMenubar } from "./menubar-context";
import type { MenubarState } from "./menubar-context";
import { dataStateOf } from "./popover-context";

export type MenubarTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function MenubarTrigger({
	className,
	onClick,
	onKeyDown,
	onPointerEnter,
	...rest
}: MenubarTriggerProps): ReactElement {
	const menu = useMenu();
	const bar = useMenubar();
	const own = useContext(MenubarValueContext);
	return (
		<button
			type="button"
			role="menuitem"
			aria-haspopup="menu"
			aria-expanded={menu.isOpen}
			aria-controls={menu.isOpen ? menu.contentId : undefined}
			{...rest}
			{...{ [MENUBAR_VALUE_ATTRIBUTE]: own }}
			ref={(node: HTMLButtonElement | null) => {
				menu.triggerRef.current = node;
			}}
			data-slot="menubar-trigger"
			data-state={dataStateOf(menu.isOpen)}
			className={cn("wg-kit-menubar-trigger", className)}
			onClick={chain(onClick, (event: MouseEvent<HTMLElement>) => toggleMenu(menu, event.detail === 0))}
			onKeyDown={chain(onKeyDown, (event: KeyboardEvent<HTMLElement>) => openOnArrowDown(menu, event))}
			onPointerEnter={chain(onPointerEnter, (event: PointerEvent<HTMLElement>) => switchOnHover(bar, own, event))}
		/>
	);
}

function openOnArrowDown(menu: MenuState, event: KeyboardEvent<HTMLElement>): void {
	if (event.key !== "ArrowDown") return;
	event.preventDefault();
	menu.focusIntent.current = "first";
	menu.setOpen(true);
}

function switchOnHover(bar: MenubarState, own: string, event: PointerEvent<HTMLElement>): void {
	if (bar.value === "" || bar.value === own) return;
	bar.focusIntent.current = "none";
	focusQuietly(event.currentTarget);
	bar.setValue(own);
}
