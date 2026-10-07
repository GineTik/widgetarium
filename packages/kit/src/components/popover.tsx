import { createElement as h, useContext, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import type { PlacementChoice, PlacementName } from "../constants/popover";
import { usePopoverState } from "../hooks/use-popover-state";
import type { PopoverState } from "../hooks/use-popover-state";
import { isNode } from "../utils/dom-nodes";
import { PopoverContent } from "./popover-content";
import { PopoverContext, dataStateOf } from "./popover-context";

export { usePopover } from "./popover-context";
export { PopoverTrigger } from "./popover-trigger";
export { PopoverContent } from "./popover-content";
export { PopoverItem } from "./popover-item";
export { PopoverSeparator } from "./popover-separator";
export { PopoverSearch } from "./popover-search";
export { PopoverAnchor } from "./popover-anchor";

export interface PopoverProps {
	readonly trigger?: ReactNode;
	readonly children?: ReactNode;
	readonly open?: boolean | undefined;
	readonly isOpen?: boolean | undefined;
	readonly defaultOpen?: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly className?: string | undefined;
	readonly placement?: PlacementName;
	readonly isPortaled?: boolean;
	readonly onExited?: (() => void) | undefined;
}

export function Popover({
	trigger,
	children,
	open,
	isOpen: openAsLegacy,
	defaultOpen = false,
	onOpenChange,
	className: cls,
	placement = "over",
	isPortaled = false,
	onExited,
}: PopoverProps): ReactElement {
	const parentId = useContext(PopoverContext)?.id;
	const [askedPlacement, askPlacement] = useState<PlacementChoice | null>(null);
	const popover = usePopoverState({
		open: open ?? openAsLegacy,
		defaultOpen,
		onOpenChange,
		placement: askedPlacement ?? placement,
		onExited,
	});
	return (
		<PopoverContext.Provider value={{ ...popover, className: cls, isPortaled, askPlacement, parentId }}>
			{trigger === undefined ? (
				<span className="wg-kit-anchor" ref={popover.anchorRef} data-state={dataStateOf(popover.isOpen)}>
					{children}
				</span>
			) : (
				<span
					className="wg-kit-anchor"
					ref={popover.anchorRef}
					aria-expanded={popover.isOpen}
					aria-controls={popover.id}
					data-state={dataStateOf(popover.isOpen)}
					onClick={(event) => toggleUnlessInside(popover, event)}
				>
					{trigger}
					<PopoverContent>{children}</PopoverContent>
				</span>
			)}
		</PopoverContext.Provider>
	);
}

function toggleUnlessInside(popover: PopoverState, event: MouseEvent): void {
	if (isNode(event.target) && popover.panelRef.current?.contains(event.target)) return;
	popover.setOpen(!popover.isOpen);
}
