import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { AnchorBox } from "../constants/popover";
import { useMenuRoot } from "../hooks/use-menu-root";
import { ContextMenuPointContext } from "./context-menu-point";
import { MenuContext } from "./menu-context";

export { ContextMenuTrigger } from "./context-menu-trigger";
export { ContextMenuContent } from "./context-menu-content";
export { MenuCheckboxItem as ContextMenuCheckboxItem } from "./menu-checkbox-item";
export { MenuGroup as ContextMenuGroup } from "./menu-group";
export { MenuItem as ContextMenuItem } from "./menu-item";
export { MenuLabel as ContextMenuLabel } from "./menu-label";
export { OverlayPortal as ContextMenuPortal } from "./overlay-portal";
export { MenuRadioGroup as ContextMenuRadioGroup } from "./menu-radio-group";
export { MenuRadioItem as ContextMenuRadioItem } from "./menu-radio-item";
export { MenuSeparator as ContextMenuSeparator } from "./menu-separator";
export { MenuShortcut as ContextMenuShortcut } from "./menu-shortcut";
export { MenuSub as ContextMenuSub } from "./menu-sub";
export { MenuSubContent as ContextMenuSubContent } from "./menu-sub-content";
export { MenuSubTrigger as ContextMenuSubTrigger } from "./menu-sub-trigger";

export interface ContextMenuProps {
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly modal?: boolean | undefined;
	readonly children?: ReactNode;
}

export function ContextMenu({ onOpenChange, children }: ContextMenuProps): ReactElement {
	const [point, setPoint] = useState<AnchorBox | null>(null);
	const menu = useMenuRoot({ family: "context-menu", onOpenChange, anchorBox: () => point });
	return (
		<ContextMenuPointContext.Provider value={setPoint}>
			<MenuContext.Provider value={menu}>{children}</MenuContext.Provider>
		</ContextMenuPointContext.Provider>
	);
}
