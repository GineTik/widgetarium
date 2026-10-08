import { createElement as h, useState } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useOpenState } from "../hooks/use-open-state";
import { cn } from "../utils/cn";
import { SidebarContext } from "./sidebar-context";

export interface SidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
}

export function SidebarProvider({
	open,
	defaultOpen = true,
	onOpenChange,
	className,
	children,
	...rest
}: SidebarProviderProps): ReactElement {
	const [isOpen, setOpen] = useOpenState({ open, defaultOpen, onOpenChange });
	const [openMobile, setOpenMobile] = useState(false);
	const sidebar = {
		state: isOpen ? "expanded" : "collapsed",
		open: isOpen,
		setOpen,
		openMobile,
		setOpenMobile,
		isMobile: false,
		toggleSidebar: () => setOpen(!isOpen),
	} as const;
	return (
		<SidebarContext.Provider value={sidebar}>
			<div data-slot="sidebar-wrapper" {...rest} className={cn("wg-kit-side-wrapper", className)}>
				{children}
			</div>
		</SidebarContext.Provider>
	);
}
