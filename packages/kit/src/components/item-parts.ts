import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const ItemContent: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-item-content",
	"ItemContent",
);

export const ItemTitle: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-item-title", "ItemTitle");

export const ItemDescription: FunctionComponent<SlotPartProps> = classedSlotPart(
	"p",
	"wg-kit-item-description",
	"ItemDescription",
);

export const ItemActions: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-item-actions",
	"ItemActions",
);

export const ItemHeader: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-item-header", "ItemHeader");

export const ItemFooter: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-item-footer", "ItemFooter");
