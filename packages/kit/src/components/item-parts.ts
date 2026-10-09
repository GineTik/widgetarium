import type { FunctionComponent } from "react";
import { ROW_PART } from "../utils/class-names";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const ItemContent: FunctionComponent<SlotPartProps> = classedSlotPart("div", ROW_PART.text, "ItemContent");

export const ItemTitle: FunctionComponent<SlotPartProps> = classedSlotPart("div", ROW_PART.label, "ItemTitle");

export const ItemDescription: FunctionComponent<SlotPartProps> = classedSlotPart(
	"p",
	ROW_PART.supporting,
	"ItemDescription",
);

export const ItemActions: FunctionComponent<SlotPartProps> = classedSlotPart("div", ROW_PART.value, "ItemActions");

export const ItemHeader: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-item-header", "ItemHeader");

export const ItemFooter: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-item-footer", "ItemFooter");
