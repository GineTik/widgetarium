import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement, Ref } from "react";
import { chainHandlers } from "../utils/chain";
import { hoverTriggerHandlers } from "../utils/hover-trigger";
import { buttonPartOf, composeRefs } from "./slot";
import { dataStateOf } from "./popover-context";
import { useTooltip } from "./tooltip-context";

export interface TooltipTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean;
	readonly ref?: Ref<HTMLElement>;
}

export function TooltipTrigger({ asChild = false, ref, onPointerDown, ...rest }: TooltipTriggerProps): ReactElement {
	const tooltip = useTooltip();
	const { part, type } = buttonPartOf(asChild);
	return h(part, {
		type,
		"data-slot": "tooltip-trigger",
		"data-state": dataStateOf(tooltip.isOpen),
		"aria-describedby": tooltip.isOpen ? tooltip.contentId : undefined,
		...rest,
		...hoverTriggerHandlers(tooltip, rest),
		onPointerDown: chainHandlers(onPointerDown, () => tooltip.settle(false)),
		ref: composeRefs(tooltip.triggerRef, ref),
	});
}
