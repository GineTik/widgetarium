import { createElement as h, useRef } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import type { FocusIntent } from "./menu-context";
import { useControllableState } from "../hooks/use-controllable-state";
import { chain } from "../utils/chain";
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
	defaultValue = "",
	onValueChange,
	className,
	onKeyDown,
	...rest
}: MenubarProps): ReactElement {
	const [openValue, setValue] = useControllableState({
		prop: value,
		defaultProp: defaultValue,
		onChange: onValueChange,
	});
	const rootRef = useRef<HTMLDivElement>(null);
	const focusIntent = useRef<FocusIntent>("panel");
	return (
		<MenubarContext.Provider value={{ value: openValue, setValue, rootRef, focusIntent }}>
			<div
				role="menubar"
				{...rest}
				ref={rootRef}
				data-slot="menubar"
				className={cn("wg-kit-menubar", className)}
				onKeyDown={chain(onKeyDown, moveAcrossTriggers)}
			/>
		</MenubarContext.Provider>
	);
}
