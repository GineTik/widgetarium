import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useMenuSub } from "../hooks/use-menu-sub";
import type { OpenAsk } from "../hooks/use-open-state";
import { MenuContext } from "./menu-context";

export interface MenuSubProps extends OpenAsk {
	readonly children?: ReactNode;
}

export function MenuSub({ children, ...ask }: MenuSubProps): ReactElement {
	return <MenuContext.Provider value={useMenuSub(ask)}>{children}</MenuContext.Provider>;
}
