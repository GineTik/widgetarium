import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const AttachmentContent: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-attachment-content",
	"AttachmentContent",
);

export const AttachmentTitle: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-attachment-title",
	"AttachmentTitle",
);

export const AttachmentDescription: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-attachment-description",
	"AttachmentDescription",
);

export const AttachmentActions: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-attachment-actions",
	"AttachmentActions",
);

export const AttachmentGroup: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-attachment-group",
	"AttachmentGroup",
);
