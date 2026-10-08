import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import type { DialogCloseProps } from "./dialog-close";
import type { DialogTriggerProps } from "./dialog-trigger";
import { createModalClose, createModalTextPart, createModalTrigger } from "./modal-parts";

export { DialogRoot as Sheet } from "./dialog-root";
export { SheetContent } from "./sheet-content";
export { OverlayPortal as SheetPortal } from "./overlay-portal";
export { OverlayScrimPart as SheetOverlay } from "./overlay-scrim-part";
export type { SheetContentProps } from "./sheet-content";

export const SheetTrigger: FunctionComponent<DialogTriggerProps> = createModalTrigger("SheetTrigger");

export const SheetClose: FunctionComponent<DialogCloseProps> = createModalClose("SheetClose");

export const SheetHeader: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-modal-header",
	"SheetHeader",
);

export const SheetFooter: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-modal-footer",
	"SheetFooter",
);

export const SheetTitle: FunctionComponent<SlotPartProps> = createModalTextPart(
	"h2",
	"wg-kit-modal-title",
	"SheetTitle",
	"titleId",
);

export const SheetDescription: FunctionComponent<SlotPartProps> = createModalTextPart(
	"p",
	"wg-kit-modal-description",
	"SheetDescription",
	"descriptionId",
);
