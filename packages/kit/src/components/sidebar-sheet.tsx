import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useSidebarSheet } from "../hooks/use-sidebar-sheet";
import type { SheetHeight } from "../hooks/use-sidebar-sheet";
import { sidebarClass } from "../utils/class-names";
import type { StyleProp } from "../utils/token-style";
import type { SidebarLook, SidebarTag } from "./sidebar";
import { SidebarSheetPanel } from "./sidebar-sheet-panel";

export type { SheetHeight } from "../hooks/use-sidebar-sheet";

export interface SidebarSheetProps extends Omit<HTMLAttributes<HTMLElement>, "style">, SidebarLook {
	readonly as?: SidebarTag;
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly height?: SheetHeight;
	readonly grip?: string;
	readonly style?: StyleProp | undefined;
}

export function SidebarSheet({
	open,
	defaultOpen,
	onOpenChange,
	height,
	mode,
	surface,
	...panel
}: SidebarSheetProps): ReactElement {
	const sheet = useSidebarSheet({ open, defaultOpen, onOpenChange, height });
	return <SidebarSheetPanel {...panel} sheet={sheet} lookClass={sidebarClass({ mode, surface })} />;
}
