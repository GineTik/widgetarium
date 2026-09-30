import { createElement as h } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactElement } from "react";
import { dataStateOf, usePopover } from "./popover-context";
import { Slot } from "./slot";

export interface PopoverTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean;
}

export function PopoverTrigger({ asChild = false, onClick, children, ...props }: PopoverTriggerProps): ReactElement {
	const popover = usePopover();
	return h(
		asChild ? Slot : "button",
		{
			type: asChild ? undefined : "button",
			"aria-haspopup": "dialog",
			"aria-expanded": popover.isOpen,
			"aria-controls": popover.id,
			"data-state": dataStateOf(popover.isOpen),
			...props,
			ref: popover.triggerRef,
			onClick: (event: MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				popover.openedByKeyboard.current = event.detail === 0;
				popover.setOpen(!popover.isOpen);
			},
		},
		children,
	);
}
