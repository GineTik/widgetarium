import { createElement as h } from "react";
import { Button } from "@widgetarium/kit";
import { Dialog } from "./dialog.js";
import { DialogContent } from "./dialog-content.js";
import { DialogClose } from "./dialog-close.js";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog-parts.js";

const CANCEL = "Cancel";

export function ConfirmDialog({
	isOpen,
	title,
	description,
	confirmLabel,
	variant = "danger",
	onConfirm,
	onOpenChange,
	className,
}) {
	return h(
		Dialog,
		{ isOpen, onOpenChange },
		h(DialogContent, { className }, [
			h(DialogClose, { key: "close" }),
			h(DialogHeader, { key: "head" }, [
				h(DialogTitle, { key: "title" }, title),
				h(DialogDescription, { key: "desc" }, description),
			]),
			h(DialogFooter, { key: "foot" }, [
				h(
					Button,
					{ key: "cancel", size: "s", className: "wg-dialog-cancel", onClick: () => onOpenChange?.(false) },
					CANCEL,
				),
				h(
					Button,
					{ key: "confirm", size: "s", variant, className: "wg-dialog-confirm", onClick: onConfirm },
					confirmLabel,
				),
			]),
		]),
	);
}
