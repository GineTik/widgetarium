import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Button, List, Row, RowLabel } from "@widgetarium/kit";
import {
	ConfirmDialog,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from "./dialog.js";
import { withTabName } from "./tab-strip-verbs.js";
import type { TabStrip } from "./use-tab-strip.js";

const DELETE_TITLE = 'Delete "{name}"?';
const DELETE = "Delete";
const DEFAULT_DELETE_WARNING = "The tab goes for good, with everything it holds. This cannot be undone.";

export function archiveDialogOf(strip: TabStrip): ReactElement {
	return h(
		Dialog,
		{ key: "archive", isOpen: strip.isArchiveShown, onOpenChange: strip.setArchiveShown },
		h(DialogContent, { className: "wg-tabs-archive" }, [
			h(DialogClose, { key: "close" }),
			h(DialogHeader, { key: "head" }, [
				h(DialogTitle, { key: "title" }, "Archived list"),
				h(
					DialogDescription,
					{ key: "desc" },
					"Restore brings a tab back exactly as it was. Delete removes it for good.",
				),
			]),
			h(
				"div",
				{ key: "body", className: "wg-dialog-body" },
				strip.archived.length === 0
					? h("p", { className: "wg-tabs-empty" }, "Nothing is archived.")
					: h(
							List,
							null,
							strip.archived.map((tab) => archivedRowOf(tab, strip)),
						),
			),
		]),
	);
}

export function deleteConfirmOf(strip: TabStrip, deleteWarning: ReactNode): ReactElement {
	return h(ConfirmDialog, {
		key: "confirm",
		isOpen: Boolean(strip.deleting),
		onOpenChange: () => strip.setDeleting(""),
		className: "wg-tabs-confirm",
		title: withTabName(DELETE_TITLE, strip.deleting),
		description: deleteWarning ?? DEFAULT_DELETE_WARNING,
		confirmLabel: DELETE,
		onConfirm: () => strip.remove(strip.deleting),
	});
}

function archivedRowOf(tab: string, strip: TabStrip): ReactElement {
	return h(Row, { key: tab }, [
		h(RowLabel, { key: "name" }, tab),
		h(
			Button,
			{ key: "restore", size: "s", className: "wg-tabs-act wg-tabs-restore", onClick: () => strip.restore(tab) },
			"Restore",
		),
		h(
			Button,
			{
				key: "delete",
				size: "s",
				variant: "danger",
				className: "wg-tabs-act wg-tabs-delete",
				onClick: () => strip.setDeleting(tab),
			},
			"Delete",
		),
	]);
}
