import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useMenuRoot } from "../hooks/use-menu-root";
import { MenuContext } from "./menu-context";

export { DropdownMenuTrigger } from "./dropdown-menu-trigger";
export { MenuContent as DropdownMenuContent } from "./menu-content";
export { MenuCheckboxItem as DropdownMenuCheckboxItem } from "./menu-checkbox-item";
export { MenuGroup as DropdownMenuGroup } from "./menu-group";
export { MenuItem as DropdownMenuItem } from "./menu-item";
export { MenuLabel as DropdownMenuLabel } from "./menu-label";
export { OverlayPortal as DropdownMenuPortal } from "./overlay-portal";
export { MenuRadioGroup as DropdownMenuRadioGroup } from "./menu-radio-group";
export { MenuRadioItem as DropdownMenuRadioItem } from "./menu-radio-item";
export { MenuSeparator as DropdownMenuSeparator } from "./menu-separator";
export { MenuShortcut as DropdownMenuShortcut } from "./menu-shortcut";
export { MenuSub as DropdownMenuSub } from "./menu-sub";
export { MenuSubContent as DropdownMenuSubContent } from "./menu-sub-content";
export { MenuSubTrigger as DropdownMenuSubTrigger } from "./menu-sub-trigger";

export interface DropdownMenuProps {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly modal?: boolean | undefined;
	readonly children?: ReactNode;
}

export function DropdownMenu({ open, defaultOpen, onOpenChange, children }: DropdownMenuProps): ReactElement {
	const menu = useMenuRoot({ family: "dropdown-menu", open, defaultOpen, onOpenChange });
	return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
}
