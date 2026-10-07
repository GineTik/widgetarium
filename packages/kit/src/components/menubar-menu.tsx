import { createElement as h, useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { useMenuRoot } from "../hooks/use-menu-root";
import { MenuContext } from "./menu-context";
import { MenubarValueContext, useMenubar } from "./menubar-context";

export interface MenubarMenuProps {
	readonly value?: string | undefined;
	readonly children?: ReactNode;
}

export function MenubarMenu({ value, children }: MenubarMenuProps): ReactElement {
	const bar = useMenubar();
	const generated = useId();
	const own = value ?? generated;
	const menu = useMenuRoot({
		family: "menubar",
		open: bar.value === own,
		onOpenChange: (open) => bar.setValue(open ? own : ""),
		focusIntent: bar.focusIntent,
		isAlsoInside: (node) => Boolean(bar.rootRef.current?.contains(node)),
	});
	return (
		<MenubarValueContext.Provider value={own}>
			<MenuContext.Provider value={menu}>{children}</MenuContext.Provider>
		</MenubarValueContext.Provider>
	);
}
