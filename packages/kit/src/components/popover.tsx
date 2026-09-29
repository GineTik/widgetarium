import { createElement as h } from "react";
import { usePopoverState } from "../hooks/use-popover-state";
import type { LooseProps } from "../types";
import { PopoverContent } from "./popover-content";
import { PopoverContext, dataStateOf } from "./popover-context";

export { usePopover } from "./popover-context";
export { PopoverTrigger } from "./popover-trigger";
export { PopoverContent } from "./popover-content";
export { PopoverItem } from "./popover-item";
export { PopoverSeparator } from "./popover-separator";
export { PopoverSearch } from "./popover-search";

export function Popover({
	trigger,
	children,
	open,
	isOpen: openAsLegacy,
	defaultOpen = false,
	onOpenChange,
	className: cls,
	placement = "over",
}: LooseProps) {
	const popover = usePopoverState({ open: open ?? openAsLegacy, defaultOpen, onOpenChange, placement });
	return (
		<PopoverContext.Provider value={{ ...popover, className: cls }}>
			{trigger === undefined ? (
				<span className="wg-kit-anchor" ref={popover.anchorRef} data-state={dataStateOf(popover.isOpen)}>
					{children}
				</span>
			) : (
				<span
					className="wg-kit-anchor"
					ref={popover.anchorRef}
					aria-expanded={String(popover.isOpen)}
					aria-controls={popover.id}
					data-state={dataStateOf(popover.isOpen)}
					onClick={(event) => {
						if (popover.panelRef.current?.contains(event.target)) return;
						popover.setOpen(!popover.isOpen);
					}}
				>
					{trigger}
					<PopoverContent>{children}</PopoverContent>
				</span>
			)}
		</PopoverContext.Provider>
	);
}
