import { createElement as h } from "react";
import type { ReactElement } from "react";
import { DialogPanel } from "./dialog-panel";
import type { DialogPanelProps } from "./dialog-panel";
import { DialogRoot } from "./dialog-root";
import type { DialogRootProps } from "./dialog-root";

export { DialogClose } from "./dialog-close";
export { DialogContent } from "./dialog-content";
export { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog-parts";
export { DialogTrigger } from "./dialog-trigger";
export type { DialogCloseProps } from "./dialog-close";
export type { DialogContentProps } from "./dialog-content";
export type { DialogPanelProps } from "./dialog-panel";
export type { DialogRootProps } from "./dialog-root";
export type { DialogTriggerProps } from "./dialog-trigger";

export type DialogProps = DialogPanelProps | DialogRootProps;

// TRADE-OFF: a Dialog given isOpen is the one-piece panel it was before shadcn's parts took the name
export function Dialog(props: DialogProps): ReactElement {
	if ("isOpen" in props) return <DialogPanel {...props} />;
	return <DialogRoot {...props} />;
}
