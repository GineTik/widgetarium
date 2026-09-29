import { createElement as h, useState } from "react";
import { cn } from "@widgetarium/kit";
import { DialogOverlay } from "./dialog-overlay.js";
import { DialogState } from "./dialog-state.js";

export { DialogOverlay } from "./dialog-overlay.js";
export { DialogContent } from "./dialog-content.js";
export { DialogClose } from "./dialog-close.js";
export { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog-parts.js";
export { ConfirmDialog } from "./confirm-dialog.js";

export function Dialog({ isOpen: isOpenAsked, onOpenChange, onClose, trigger, children, className: cls }) {
	const [isSelfOpen, setSelfOpen] = useState(false);
	const isControlled = isOpenAsked !== undefined;
	const isOpen = isControlled ? isOpenAsked : isSelfOpen;

	const setOpen = (next) => {
		if (!isControlled) setSelfOpen(next);
		onOpenChange?.(next);
		if (!next) onClose?.();
	};

	const close = () => setOpen(false);
	const body = isOpen
		? h(DialogOverlay, { className: cn(cls), onClose: close }, h(DialogState.Provider, { value: { close } }, children))
		: null;

	if (!trigger) return body;

	return h("span", { className: "wg-dialog-trigger" }, [h("span", { onClick: () => setOpen(true) }, trigger), body]);
}
