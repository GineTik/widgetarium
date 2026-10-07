import { createElement as h } from "react";
import type { AnchorHTMLAttributes, ReactElement, Ref } from "react";
import { hoverTriggerHandlers } from "../utils/hover-trigger";
import { useHoverCard } from "./hover-card-context";
import { dataStateOf } from "./popover-context";
import { composeRefs, Slot } from "./slot";

export interface HoverCardTriggerProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
	readonly asChild?: boolean;
	readonly ref?: Ref<HTMLElement>;
}

export function HoverCardTrigger({ asChild = false, ref, ...rest }: HoverCardTriggerProps): ReactElement {
	const card = useHoverCard();
	return h(asChild ? Slot : "a", {
		"data-slot": "hover-card-trigger",
		"data-state": dataStateOf(card.isOpen),
		...rest,
		...hoverTriggerHandlers(card, rest),
		ref: composeRefs(card.triggerRef, ref),
	});
}
