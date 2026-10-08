import { createElement as h, useContext } from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, MouseEvent, PointerEvent, ReactElement } from "react";
import { chainHandlers } from "../utils/chain";
import { cn } from "../utils/cn";
import { focusQuietly } from "../utils/focus";
import { toggleMenu } from "../utils/menu-trigger";
import { menuTriggerAria } from "../utils/menu-trigger-aria";
import type { MenuState } from "./menu-context";
import { useMenu } from "./menu-context";
import { MENUBAR_VALUE_ATTRIBUTE, MenubarValueContext, useMenubar } from "./menubar-context";
import type { MenubarState } from "./menubar-context";
import { dataStateOf } from "./popover-context";
import { composeRefs } from "./slot";

export type MenubarTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

type TriggerHandlers = Required<Pick<ButtonHTMLAttributes<HTMLElement>, "onClick" | "onKeyDown" | "onPointerEnter">>;

interface MenubarTriggerPress {
	readonly menu: MenuState;
	readonly bar: MenubarState;
	readonly own: string;
	readonly theirs: Partial<TriggerHandlers>;
}

export function MenubarTrigger({ className, ...rest }: MenubarTriggerProps): ReactElement {
	const menu = useMenu();
	const bar = useMenubar();
	const own = useContext(MenubarValueContext);
	return (
		<button
			type="button"
			role="menuitem"
			{...menuTriggerAria(menu)}
			{...rest}
			{...{ [MENUBAR_VALUE_ATTRIBUTE]: own }}
			ref={composeRefs(menu.triggerRef)}
			data-slot="menubar-trigger"
			data-state={dataStateOf(menu.isOpen)}
			className={cn("wg-kit-menubar-trigger", className)}
			{...menubarTriggerHandlers({ menu, bar, own, theirs: rest })}
		/>
	);
}

function menubarTriggerHandlers({ menu, bar, own, theirs }: MenubarTriggerPress): TriggerHandlers {
	return {
		onClick: chainHandlers(theirs.onClick, (event: MouseEvent<HTMLElement>) => toggleMenu(menu, event.detail === 0)),
		onKeyDown: chainHandlers(theirs.onKeyDown, (event: KeyboardEvent<HTMLElement>) => openOnArrowDown(menu, event)),
		onPointerEnter: chainHandlers(theirs.onPointerEnter, (event: PointerEvent<HTMLElement>) =>
			switchOnHover(bar, own, event),
		),
	};
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
