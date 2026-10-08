import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { chainHandlers } from "../utils/chain";
import { cn } from "../utils/cn";
import { moveInMenu } from "../utils/menu-keys";
import { FloatingPanel } from "./floating-panel";
import { MENU_TREE_ATTRIBUTE, menuSlot } from "./menu-context";
import type { MenuState } from "./menu-context";

export interface MenuPanelProps extends HTMLAttributes<HTMLDivElement> {
	readonly menu: MenuState;
	readonly panelRef: Ref<HTMLDivElement>;
}

export function MenuPanel({ menu, panelRef, className, onKeyDown, ...rest }: MenuPanelProps): ReactElement {
	return (
		<FloatingPanel
			role="menu"
			aria-orientation="vertical"
			tabIndex={-1}
			id={menu.contentId}
			{...rest}
			{...{ [MENU_TREE_ATTRIBUTE]: menu.treeId }}
			isOpen={menu.isOpen}
			panelRef={panelRef}
			data-slot={menuSlot(menu, menu.parent ? "sub-content" : "content")}
			className={cn("wg-kit-menu", className)}
			onKeyDown={chainHandlers(onKeyDown, (event) => moveInMenu(event, menu))}
		/>
	);
}
