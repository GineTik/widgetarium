import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const Empty: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-empty", "Empty");

export const EmptyHeader: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-empty-header",
	"EmptyHeader",
);

export const EmptyTitle: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-empty-title", "EmptyTitle");

export const EmptyDescription: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-empty-text",
	"EmptyDescription",
);

export const EmptyContent: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-empty-action",
	"EmptyContent",
);
