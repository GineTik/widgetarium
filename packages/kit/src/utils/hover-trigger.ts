import type { FocusEvent, HTMLAttributes, PointerEvent } from "react";
import type { HoverLayer } from "../hooks/use-hover-layer";
import { chainHandlers } from "./chain";
import { isFocusVisible } from "./focus";

export type HoverHandlers = Pick<
	HTMLAttributes<HTMLElement>,
	"onPointerEnter" | "onPointerLeave" | "onFocus" | "onBlur"
>;

export function hoverTriggerHandlers(layer: HoverLayer, theirs: HoverHandlers): Required<HoverHandlers> {
	return {
		onPointerEnter: chainHandlers(theirs.onPointerEnter, (event: PointerEvent<HTMLElement>) => {
			if (event.pointerType !== "touch") layer.openSoon();
		}),
		onPointerLeave: chainHandlers(theirs.onPointerLeave, () => layer.closeSoon()),
		onFocus: chainHandlers(theirs.onFocus, (event: FocusEvent<HTMLElement>) => {
			if (isFocusVisible(event.currentTarget)) layer.settle(true);
		}),
		onBlur: chainHandlers(theirs.onBlur, () => layer.settle(false)),
	};
}

export function hoverContentHandlers(layer: HoverLayer, theirs: HoverHandlers): HoverHandlers {
	return {
		onPointerEnter: chainHandlers(theirs.onPointerEnter, () => layer.settle(true)),
		onPointerLeave: chainHandlers(theirs.onPointerLeave, () => layer.closeSoon()),
	};
}
