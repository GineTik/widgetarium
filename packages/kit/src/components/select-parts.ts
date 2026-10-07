import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const SelectGroup: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-select-group",
	"SelectGroup",
);

export const SelectLabel: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-select-label",
	"SelectLabel",
);
