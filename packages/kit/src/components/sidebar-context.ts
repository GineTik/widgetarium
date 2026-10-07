import { createContext, useContext } from "react";
import type { Context } from "react";

export interface SidebarState {
	readonly state: "expanded" | "collapsed";
	readonly open: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly openMobile: boolean;
	readonly setOpenMobile: (open: boolean) => void;
	readonly isMobile: boolean;
	readonly toggleSidebar: () => void;
}

export const SidebarContext: Context<SidebarState | null> = createContext<SidebarState | null>(null);

export function useSidebar(): SidebarState {
	const sidebar = useContext(SidebarContext);
	if (!sidebar) throw new Error("useSidebar must be used within a SidebarProvider");
	return sidebar;
}
