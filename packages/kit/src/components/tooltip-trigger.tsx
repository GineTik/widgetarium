import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement, Ref } from "react";
import { chain } from "../utils/chain";
import { hoverTriggerHandlers } from "../utils/hover-trigger";
import { composeRefs, Slot } from "./slot";
import { dataStateOf } from "./popover-context";
import { useTooltip } from "./tooltip-context";

export interface TooltipTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean;
	readonly ref?: Ref<HTMLElement>;
}

export function TooltipTrigger({ asChild = false, ref, onPointerDown, ...rest }: TooltipTriggerProps): ReactElement {
	const tooltip = useTooltip();
	return h(asChild ? Slot : "button", {
		type: asChild ? undefined : "button",
		"data-slot": "tooltip-trigger",
		"data-state": dataStateOf(tooltip.isOpen),
		"aria-describedby": tooltip.isOpen ? tooltip.contentId : undefined,
		...rest,
		...hoverTriggerHandlers(tooltip, rest),
		onPointerDown: chain(onPointerDown, () => tooltip.settle(false)),
		ref: composeRefs(tooltip.triggerRef, ref),
	});
}
