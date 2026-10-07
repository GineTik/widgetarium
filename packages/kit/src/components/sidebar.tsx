import { createElement as h, useContext } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { sidebarClass } from "../utils/class-names";
import type { SidebarAt, SidebarMode, SidebarSurface } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { SidebarContext } from "./sidebar-context";
import { Slot } from "./slot";

export { SidebarGroup } from "./sidebar-group";
export { SidebarRow } from "./sidebar-row";
export { SidebarSheet } from "./sidebar-sheet";
export { SidebarProvider } from "./sidebar-provider";
export { SidebarMenuButton } from "./sidebar-menu-button";
export { SidebarTrigger } from "./sidebar-trigger";
export { useSidebar } from "./sidebar-context";
export {
	SidebarContent,
	SidebarFooter,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuItem,
} from "./sidebar-parts";
export type { SidebarGroupProps } from "./sidebar-group";
export type { SidebarRowProps, SidebarRowState } from "./sidebar-row";
export type { SheetHeight, SidebarSheetProps } from "./sidebar-sheet";
export type { SidebarProviderProps } from "./sidebar-provider";
export type { SidebarMenuButtonProps } from "./sidebar-menu-button";
export type { SidebarState } from "./sidebar-context";

export type SidebarTag = "div" | "aside" | "nav" | "section" | "button" | "li" | "a";

export type SidebarVariant = "sidebar" | "floating" | "inset";

export type SidebarCollapsible = "offcanvas" | "icon" | "none";

export interface SidebarLook {
	readonly mode?: SidebarMode | undefined;
	readonly surface?: SidebarSurface | undefined;
	readonly at?: SidebarAt | undefined;
}

export interface SidebarProps extends HTMLAttributes<HTMLElement>, SidebarLook {
	readonly as?: SidebarTag;
	readonly asChild?: boolean;
	readonly side?: "left" | "right" | undefined;
	readonly variant?: SidebarVariant | undefined;
	readonly collapsible?: SidebarCollapsible | undefined;
}

const SURFACE_OF_VARIANT: Readonly<Record<SidebarVariant, SidebarSurface>> = {
	sidebar: "edge",
	floating: "solid",
	inset: "edge",
};

const AT_OF_SIDE: Readonly<Record<"left" | "right", SidebarAt>> = { left: "start", right: "end" };

export function Sidebar({
	as = "div",
	asChild = false,
	at,
	side,
	variant,
	collapsible = "offcanvas",
	mode,
	surface,
	className,
	children,
	...props
}: SidebarProps): ReactElement {
	const isCollapsed = useContext(SidebarContext)?.state === "collapsed" && collapsible !== "none";
	const look = {
		mode: isCollapsed && collapsible === "icon" ? "minimal" : mode,
		surface: surface ?? (variant ? SURFACE_OF_VARIANT[variant] : undefined),
		at: at ?? (side ? AT_OF_SIDE[side] : undefined),
	};
	return h(
		asChild ? Slot : as,
		{
			"data-slot": "sidebar",
			"data-state": isCollapsed ? "collapsed" : "expanded",
			"data-collapsible": isCollapsed ? collapsible : undefined,
			...domPropsOf(props),
			className: cn(sidebarClass({ ...look, className }), isCollapsed && collapsible === "offcanvas" && "is-collapsed"),
		},
		children,
	);
}
