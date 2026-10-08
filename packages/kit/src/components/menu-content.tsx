import { createElement as h, useMemo } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { DEFAULT_SIDE_OFFSET } from "../constants/popover";
import type { PopoverAlign, PopoverSide } from "../constants/popover";
import { useMenuPanel } from "../hooks/use-menu-panel";
import { useMenu } from "./menu-context";
import { MenuPanel } from "./menu-panel";
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
	...rest
}: MenuContentProps): ReactElement | null {
	const menu = useMenu();
	const { panelRef, isMounted } = useMenuPanel(menu, { side, align, sideOffset, alignOffset });
	const registeredPanelRef = useMemo(() => composeRefs(panelRef, menu.panelRef), [panelRef, menu.panelRef]);
	if (!isMounted) return null;
	return <MenuPanel {...rest} menu={menu} panelRef={registeredPanelRef} />;
}
