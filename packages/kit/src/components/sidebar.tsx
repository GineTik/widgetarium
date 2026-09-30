import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { sidebarClass } from "../utils/class-names";
import type { SidebarMode, SidebarSurface } from "../utils/class-names";
import { domPropsOf } from "../utils/dom-props";
import { Slot } from "./slot";

export { SidebarGroup } from "./sidebar-group";
export { SidebarRow } from "./sidebar-row";
export { SidebarSheet } from "./sidebar-sheet";
export type { SidebarGroupProps } from "./sidebar-group";
export type { SidebarRowProps, SidebarRowState } from "./sidebar-row";
export type { SheetHeight, SidebarSheetProps } from "./sidebar-sheet";

export type SidebarTag = "div" | "aside" | "nav" | "section" | "button" | "li" | "a";

export interface SidebarLook {
	readonly mode?: SidebarMode | undefined;
	readonly surface?: SidebarSurface | undefined;
}

export interface SidebarProps extends HTMLAttributes<HTMLElement>, SidebarLook {
	readonly as?: SidebarTag;
	readonly asChild?: boolean;
}

export function Sidebar({ as = "div", asChild = false, children, ...props }: SidebarProps): ReactElement {
	return h(asChild ? Slot : as, { ...domPropsOf(props), className: sidebarClass(props) }, children);
}
