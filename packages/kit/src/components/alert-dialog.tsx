import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import type { DialogCloseProps } from "./dialog-close";
import type { DialogTriggerProps } from "./dialog-trigger";
import { createModalClose, createModalTextPart, createModalTrigger } from "./modal-parts";

export { DialogRoot as AlertDialog } from "./dialog-root";
export { AlertDialogContent } from "./alert-dialog-content";
export { AlertDialogCancel } from "./alert-dialog-cancel";
export { OverlayPortal as AlertDialogPortal } from "./overlay-portal";
export { OverlayScrimPart as AlertDialogOverlay } from "./overlay-scrim-part";
export type { AlertDialogContentProps } from "./alert-dialog-content";

export const AlertDialogTrigger: FunctionComponent<DialogTriggerProps> = createModalTrigger("AlertDialogTrigger");

export const AlertDialogAction: FunctionComponent<DialogCloseProps> = createModalClose("AlertDialogAction", {
	variant: "default",
});

export const AlertDialogHeader: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-modal-header",
	"AlertDialogHeader",
);

export const AlertDialogFooter: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-modal-footer",
	"AlertDialogFooter",
);

export const AlertDialogTitle: FunctionComponent<SlotPartProps> = createModalTextPart(
	"h2",
	"wg-kit-modal-title",
	"AlertDialogTitle",
	"titleId",
);

export const AlertDialogDescription: FunctionComponent<SlotPartProps> = createModalTextPart(
	"p",
	"wg-kit-modal-description",
	"AlertDialogDescription",
	"descriptionId",
);
