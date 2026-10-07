import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MenuContent } from "./menu-content";
import type { MenuContentProps } from "./menu-content";

export type ContextMenuContentProps = Omit<MenuContentProps, "side" | "align" | "sideOffset">;

const BESIDE_THE_POINTER_PX = 2;

export function ContextMenuContent(props: ContextMenuContentProps): ReactElement {
	return <MenuContent side="right" align="start" sideOffset={BESIDE_THE_POINTER_PX} {...props} />;
}
