import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { usePopover } from "./popover-context";
import { Slot } from "./slot";

export interface PopoverAnchorProps extends HTMLAttributes<HTMLElement> {
	readonly asChild?: boolean;
}

export function PopoverAnchor({ asChild = false, ...rest }: PopoverAnchorProps): ReactElement {
	const popover = usePopover();
	return h(asChild ? Slot : "div", { "data-slot": "popover-anchor", ...rest, ref: popover.pointRef });
}
