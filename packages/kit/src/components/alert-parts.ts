import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const AlertTitle: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-alert-title", "AlertTitle");

export const AlertDescription: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-alert-description",
	"AlertDescription",
);

export const AlertAction: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-alert-action",
	"AlertAction",
);
