import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const MessageGroup: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-message-group",
	"MessageGroup",
);

export const MessageAvatar: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-message-avatar",
	"MessageAvatar",
);

export const MessageContent: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-message-content",
	"MessageContent",
);

export const MessageHeader: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-message-header",
	"MessageHeader",
);

export const MessageFooter: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-message-footer",
	"MessageFooter",
);
