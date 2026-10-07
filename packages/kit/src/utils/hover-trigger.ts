import type { FocusEvent, HTMLAttributes, PointerEvent } from "react";
import type { HoverLayer } from "../hooks/use-hover-layer";
import { chain } from "./chain";
import { isFocusVisible } from "./focus";

export type HoverHandlers = Pick<
	HTMLAttributes<HTMLElement>,
	"onPointerEnter" | "onPointerLeave" | "onFocus" | "onBlur"
>;

export function hoverTriggerHandlers(layer: HoverLayer, theirs: HoverHandlers): Required<HoverHandlers> {
	return {
		onPointerEnter: chain(theirs.onPointerEnter, (event: PointerEvent<HTMLElement>) => {
			if (event.pointerType !== "touch") layer.openSoon();
		}),
		onPointerLeave: chain(theirs.onPointerLeave, () => layer.closeSoon()),
		onFocus: chain(theirs.onFocus, (event: FocusEvent<HTMLElement>) => {
			if (isFocusVisible(event.currentTarget)) layer.settle(true);
		}),
		onBlur: chain(theirs.onBlur, () => layer.settle(false)),
	};
}

export function hoverContentHandlers(layer: HoverLayer, theirs: HoverHandlers): HoverHandlers {
	return {
		onPointerEnter: chain(theirs.onPointerEnter, () => layer.settle(true)),
		onPointerLeave: chain(theirs.onPointerLeave, () => layer.closeSoon()),
	};
}
