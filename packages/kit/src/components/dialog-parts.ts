import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import { modalTextPart } from "./modal-parts";

export const DialogHeader: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-dialog-header",
	"DialogHeader",
);

export const DialogTitle: FunctionComponent<SlotPartProps> = modalTextPart(
	"h2",
	"wg-kit-dialog-title",
	"DialogTitle",
	"titleId",
);

export const DialogDescription: FunctionComponent<SlotPartProps> = modalTextPart(
	"p",
	"wg-kit-dialog-description",
	"DialogDescription",
	"descriptionId",
);

export const DialogFooter: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-dialog-actions",
	"DialogFooter",
);
