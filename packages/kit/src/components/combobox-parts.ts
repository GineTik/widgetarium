import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const ComboboxGroup: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-combobox-group",
	"ComboboxGroup",
);

export const ComboboxLabel: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-combobox-label",
	"ComboboxLabel",
);

export const ComboboxSeparator: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-combobox-separator",
	"ComboboxSeparator",
);
