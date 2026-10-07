import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const BubbleGroup: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-bubble-group",
	"BubbleGroup",
);
