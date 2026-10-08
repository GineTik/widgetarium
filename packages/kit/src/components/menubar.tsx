import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useMenubarState } from "../hooks/use-menubar-state";
import { chainHandlers } from "../utils/chain";
import { cn } from "../utils/cn";
import { moveAcrossTriggers } from "../utils/menubar-keys";
import { MenubarContext } from "./menubar-context";

export { MenubarMenu } from "./menubar-menu";
export { MenubarTrigger } from "./menubar-trigger";
export { MenubarContent } from "./menubar-content";
export { MenuCheckboxItem as MenubarCheckboxItem } from "./menu-checkbox-item";
export { MenuGroup as MenubarGroup } from "./menu-group";
export { MenuItem as MenubarItem } from "./menu-item";
export { MenuLabel as MenubarLabel } from "./menu-label";
export { OverlayPortal as MenubarPortal } from "./overlay-portal";
export { MenuRadioGroup as MenubarRadioGroup } from "./menu-radio-group";
export { MenuRadioItem as MenubarRadioItem } from "./menu-radio-item";
export { MenuSeparator as MenubarSeparator } from "./menu-separator";
export { MenuShortcut as MenubarShortcut } from "./menu-shortcut";
export { MenuSub as MenubarSub } from "./menu-sub";
export { MenuSubContent as MenubarSubContent } from "./menu-sub-content";
export { MenuSubTrigger as MenubarSubTrigger } from "./menu-sub-trigger";

export interface MenubarProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue"> {
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
}

export function Menubar({
	value,
	defaultValue,
	onValueChange,
	className,
	onKeyDown,
	...rest
}: MenubarProps): ReactElement {
	const bar = useMenubarState({ value, defaultValue, onValueChange });
	return (
		<MenubarContext.Provider value={bar}>
			<div
				role="menubar"
				{...rest}
				ref={bar.rootRef}
				data-slot="menubar"
				className={cn("wg-kit-menubar", className)}
				onKeyDown={chainHandlers(onKeyDown, moveAcrossTriggers)}
			/>
		</MenubarContext.Provider>
	);
}
