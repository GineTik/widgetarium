import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const DialogHeader: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-dialog-header",
	"DialogHeader",
);

export const DialogTitle: FunctionComponent<SlotPartProps> = classedSlotPart(
	"h2",
	"wg-kit-dialog-title",
	"DialogTitle",
);

export const DialogDescription: FunctionComponent<SlotPartProps> = classedSlotPart(
	"p",
	"wg-kit-dialog-description",
	"DialogDescription",
);

export const DialogFooter: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-dialog-actions",
	"DialogFooter",
);
