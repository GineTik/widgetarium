import { createElement as h } from "react";
import type { FunctionComponent, ReactElement } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import { useDrawerRoot } from "../hooks/use-drawer-root";
import type { DrawerRootAsk } from "../hooks/use-drawer-root";
import type { DialogCloseProps } from "./dialog-close";
import { DialogContext } from "./dialog-context";
import type { DialogRootProps } from "./dialog-root";
import type { DialogTriggerProps } from "./dialog-trigger";
import { DrawerContext } from "./drawer-context";
import { createModalClose, createModalTextPart, createModalTrigger } from "./modal-parts";

export { DrawerContent } from "./drawer-content";
export { OverlayPortal as DrawerPortal } from "./overlay-portal";
export { OverlayScrimPart as DrawerOverlay } from "./overlay-scrim-part";
export type { DrawerContentProps } from "./drawer-content";
export type { SnapPoint } from "../utils/drawer-snaps";

export interface DrawerProps extends DialogRootProps, DrawerRootAsk {}

export function Drawer({ children, ...ask }: DrawerProps): ReactElement {
	const { dialog, settings } = useDrawerRoot(ask);
	return (
		<DrawerContext.Provider value={settings}>
			<DialogContext.Provider value={dialog}>{children}</DialogContext.Provider>
		</DrawerContext.Provider>
	);
}

export const DrawerTrigger: FunctionComponent<DialogTriggerProps> = createModalTrigger("DrawerTrigger");

export const DrawerClose: FunctionComponent<DialogCloseProps> = createModalClose("DrawerClose");

export const DrawerHeader: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-modal-header",
	"DrawerHeader",
);

export const DrawerFooter: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-modal-footer",
	"DrawerFooter",
);

export const DrawerTitle: FunctionComponent<SlotPartProps> = createModalTextPart(
	"h2",
	"wg-kit-modal-title",
	"DrawerTitle",
	"titleId",
);

export const DrawerDescription: FunctionComponent<SlotPartProps> = createModalTextPart(
	"p",
	"wg-kit-modal-description",
	"DrawerDescription",
	"descriptionId",
);
