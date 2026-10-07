import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useMenuSub } from "../hooks/use-menu-sub";
import type { MenuSubAsk } from "../hooks/use-menu-sub";
import { MenuContext } from "./menu-context";

export interface MenuSubProps extends MenuSubAsk {
	readonly children?: ReactNode;
}

export function MenuSub({ children, ...ask }: MenuSubProps): ReactElement {
	return <MenuContext.Provider value={useMenuSub(ask)}>{children}</MenuContext.Provider>;
}
