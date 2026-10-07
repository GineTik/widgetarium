import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const InputGroupText: FunctionComponent<SlotPartProps> = classedSlotPart(
	"span",
	"wg-kit-input-group-text",
	"InputGroupText",
);
