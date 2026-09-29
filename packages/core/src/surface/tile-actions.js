import { createElement as h } from "react";

const ICON_GEAR = [
	"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
	"M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
];
const ICON_DELETION_BIN = [
	"M3 6h18",
	"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
	"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
	"M10 11v6",
	"M14 11v6",
];

export function tileActions(tileId, onOpenSettings, onRemove) {
	return h(
		"span",
		{ className: "wg-tile-actions", key: "actions", onPointerDown: (event) => event.stopPropagation() },
		[
			h(
				"button",
				{
					key: "settings",
					title: "Settings",
					"aria-label": "Settings",
					onClick: (event) => onOpenSettings?.(tileId, sizeOfCell(event.currentTarget)),
				},
				icon(ICON_GEAR),
			),
			h(
				"button",
				{ key: "remove", title: "Remove", "aria-label": "Remove", onClick: () => onRemove?.(tileId) },
				icon(ICON_DELETION_BIN),
			),
		],
	);
}

function icon(paths) {
	return h(
		"svg",
		{ className: "wg-icon", viewBox: "0 0 24 24", "aria-hidden": "true" },
		paths.map((d, index) => h("path", { key: index, d, strokeLinecap: "round", strokeLinejoin: "round" })),
	);
}

function sizeOfCell(node) {
	const at = node.closest(".wg-tree-cell")?.getBoundingClientRect();
	return at ? { width: Math.round(at.width), height: Math.round(at.height) } : null;
}
