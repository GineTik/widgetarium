import { createElement as h } from "react";
import { CatalogueDialog } from "../catalogue-dialog.js";
import { ConfirmDialog } from "../dialog.js";
import { classOf, measureGrid } from "../paths.js";
import { MIN_HEIGHT_PX, MIN_SIDEBAR_PX } from "../tree.js";
import { countReaders } from "./count-readers.js";
import { TreeBoard } from "./tree-board.js";
import { TreeSettings } from "./tree-settings.js";

const UNMEASURED_CELL = { width: MIN_SIDEBAR_PX, height: MIN_HEIGHT_PX };

export function surfaceParts(context) {
	const { board, session, edits, removal, picking, registry, host } = context;
	const held = session.held;
	const configured = held && board.tiles.find((tile) => tile.id === held.id);
	const canvasBox = held?.canvasBox ?? UNMEASURED_CELL;
	return [
		treeElement(context, canvasBox),
		configured ? settingsElement(context, configured, canvasBox) : null,
		removalDialog(removal, edits.removeTile),
		Array.isArray(picking.into)
			? placeCatalogue({ registry, host, onPick: (widgetId) => edits.addTileInto(widgetId, picking.into), picking })
			: null,
	];
}

function treeElement({ board, width, shared, editing, edits, session, removal, picking, onActions }, canvasBox) {
	const held = session.held;
	return h(TreeBoard, {
		key: "tree",
		board,
		width,
		shared,
		editing,
		settingsId: held?.id ?? null,
		settingsStandInPx: held ? canvasBox.height : 0,
		onOpenSettings: session.open,
		onRemove: removal.set,
		onAdd: picking.set,
		patchTile: edits.patchTile,
		commitLayout: edits.commitLayout,
		commitHolds: edits.commitHolds,
		onActions,
	});
}

function settingsElement({ board, width, host, registry, refs, shared, edits, session }, configured, canvasBox) {
	const held = session.held;
	const metrics = measureGrid(width);
	return h(TreeSettings, {
		key: "settings",
		session: `${session.isOpen ? "open" : "closing"}:${held.key}`,
		tile: configured,
		canvasBox,
		entryPath: held.entryPath ?? null,
		shared,
		patchTile: edits.patchTile,
		board,
		commitLayout: edits.commitLayout,
		frame: {
			host,
			registry,
			refs,
			cell: metrics.cell,
			gap: metrics.gap,
			phone: classOf(width).name === "phone",
			columns: metrics.columns,
			countReaders: (folderPath) => countReaders(registry, board.tiles, folderPath),
			onDone: () => session.close(true),
			onDismiss: () => session.close(false),
		},
	});
}

function removalDialog(removal, removeTile) {
	return h(ConfirmDialog, {
		key: "removal",
		isOpen: removal.id !== null,
		title: "Remove this widget?",
		description: "It leaves the board and its settings go with it.",
		confirmLabel: "Remove",
		onConfirm: () => {
			removeTile(removal.id);
			removal.set(null);
		},
		onOpenChange: () => removal.set(null),
	});
}

function placeCatalogue({ registry, host, onPick, picking }) {
	return h(CatalogueDialog, {
		key: "catalogue",
		registry,
		host,
		mode: "place",
		onPick: (widgetId) => {
			onPick(widgetId);
			picking.set(null);
		},
		onClose: () => picking.set(null),
	});
}
