import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const CardHeader: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-card-header", "CardHeader");

export const CardTitle: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-card-title", "CardTitle");

export const CardDescription: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-card-description",
	"CardDescription",
);

export const CardAction: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-card-action", "CardAction");

export const CardContent: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-card-content",
	"CardContent",
);

export const CardFooter: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-card-footer", "CardFooter");
