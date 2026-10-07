import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import type { DialogCloseProps } from "./dialog-close";
import type { DialogTriggerProps } from "./dialog-trigger";
import { modalClose, modalTextPart, modalTrigger } from "./modal-parts";

export { DialogRoot as Sheet } from "./dialog-root";
export { SheetContent } from "./sheet-content";
export { OverlayPortal as SheetPortal } from "./overlay-portal";
export { OverlayScrimPart as SheetOverlay } from "./overlay-scrim-part";
export type { SheetContentProps } from "./sheet-content";

export const SheetTrigger: FunctionComponent<DialogTriggerProps> = modalTrigger("SheetTrigger");

export const SheetClose: FunctionComponent<DialogCloseProps> = modalClose("SheetClose");

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

export const SheetTitle: FunctionComponent<SlotPartProps> = modalTextPart(
	"h2",
	"wg-kit-modal-title",
	"SheetTitle",
	"titleId",
);

export const SheetDescription: FunctionComponent<SlotPartProps> = modalTextPart(
	"p",
	"wg-kit-modal-description",
	"SheetDescription",
	"descriptionId",
);
