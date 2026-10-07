import { createElement as h } from "react";
import type { FunctionComponent, HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const MarkerContent: FunctionComponent<SlotPartProps> = classedSlotPart(
	"span",
	"wg-kit-marker-content",
	"MarkerContent",
);

export const MarkerIcon: FunctionComponent<HTMLAttributes<HTMLSpanElement>> = function MarkerIcon({
	className,
	...rest
}): ReactElement {
	return h("span", {
		"data-slot": "marker-icon",
		"aria-hidden": "true",
		...rest,
		className: cn("wg-kit-marker-icon", className),
	});
};
