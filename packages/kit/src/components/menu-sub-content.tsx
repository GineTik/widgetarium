import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MenuContent } from "./menu-content";
import type { MenuContentProps } from "./menu-content";

export type MenuSubContentProps = Omit<MenuContentProps, "side" | "align">;

const SUB_OFFSET_PX = 4;

const FIRST_ITEM_LEVEL_PX = -8;

export function MenuSubContent(props: MenuSubContentProps): ReactElement {
	return (
		<MenuContent side="right" align="start" sideOffset={SUB_OFFSET_PX} alignOffset={FIRST_ITEM_LEVEL_PX} {...props} />
	);
}
