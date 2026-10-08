import { createElement as h, useMemo } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { DEFAULT_SIDE_OFFSET } from "../constants/popover";
import type { PopoverAlign, PopoverSide } from "../constants/popover";
import { useMenuPanel } from "../hooks/use-menu-panel";
import { chainHandlers } from "../utils/chain";
import { cn } from "../utils/cn";
import { moveInMenu } from "../utils/menu-keys";
import { FloatingPanel } from "./floating-panel";
import { MENU_TREE_ATTRIBUTE, menuSlot, useMenu } from "./menu-context";
import { composeRefs } from "./slot";

export interface MenuContentProps extends HTMLAttributes<HTMLDivElement> {
	readonly side?: PopoverSide | undefined;
	readonly align?: PopoverAlign | undefined;
	readonly sideOffset?: number | undefined;
	readonly alignOffset?: number | undefined;
	readonly loop?: boolean | undefined;
}

export function MenuContent({
	side = "bottom",
	align = "center",
	sideOffset = DEFAULT_SIDE_OFFSET,
	alignOffset = 0,
	loop: _loopsAlways,
	className,
	onKeyDown,
	...rest
}: MenuContentProps): ReactElement | null {
	const menu = useMenu();
	const { panelRef, isMounted } = useMenuPanel(menu, { side, align, sideOffset, alignOffset });
	const registeredPanelRef = useMemo(() => composeRefs(panelRef, menu.panelRef), [panelRef, menu.panelRef]);
	if (!isMounted) return null;
	return (
		<FloatingPanel
			role="menu"
			aria-orientation="vertical"
			tabIndex={-1}
			id={menu.contentId}
			{...rest}
			{...{ [MENU_TREE_ATTRIBUTE]: menu.treeId }}
			isOpen={menu.isOpen}
			panelRef={registeredPanelRef}
			data-slot={menuSlot(menu, menu.parent ? "sub-content" : "content")}
			className={cn("wg-kit-menu", className)}
			onKeyDown={chainHandlers(onKeyDown, (event) => moveInMenu(event, menu))}
		/>
	);
}
