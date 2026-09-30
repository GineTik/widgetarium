import { createElement as h } from "react";
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from "react";
import { CatalogueDialog } from "../catalogue-dialog.js";
import { ConfirmDialog } from "../dialog.js";
import { classOf, measureGrid } from "../paths.js";
import { MIN_HEIGHT_PX, MIN_SIDEBAR_PX } from "../tree.js";
import type { NodePath } from "../tree.js";
import type { Board, Tile } from "../model.js";
import type { GatewayRefs } from "../gateway/refs.js";
import type { BoardEdits } from "./board-edits.js";
import { countReaders } from "./count-readers.js";
import type { CellSize } from "./tile-actions.js";
import { TreeBoard } from "./tree-board.js";
import { TreeSettings } from "./tree-settings.js";
import type { OnActions } from "./use-header-actions.js";
import type { SettingsSession, SettingsTile } from "./use-settings-session.js";
import type { BoardRegistry, SurfaceHost, SurfaceShared } from "./use-surface-shared.js";

const UNMEASURED_CELL: CellSize = { width: MIN_SIDEBAR_PX, height: MIN_HEIGHT_PX };

interface Removal {
	readonly id: string | null;
	readonly set: Dispatch<SetStateAction<string | null>>;
}

export interface Picking {
	readonly into: NodePath | null;
	readonly set: Dispatch<SetStateAction<NodePath | null>>;
}

interface SurfaceContext {
	readonly board: Board;
	readonly width: number;
	readonly host: SurfaceHost;
	readonly registry: BoardRegistry;
	readonly refs: GatewayRefs;
	readonly shared: SurfaceShared;
	readonly editing: boolean;
	readonly onActions: OnActions | null | undefined;
	readonly edits: BoardEdits;
	readonly session: SettingsSession;
	readonly removal: Removal;
	readonly picking: Picking;
}

export function surfaceParts(context: SurfaceContext): ReactNode[] {
	const { board, session, edits, removal, picking, registry, host } = context;
	const held = session.held;
	const configured = held && board.tiles.find((tile) => tile.id === held.id);
	const canvasBox = held?.canvasBox ?? UNMEASURED_CELL;
	const pickingInto = picking.into;
	return [
		treeElement(context, canvasBox),
		held && configured ? settingsElement(context, { configured, held, canvasBox }) : null,
		removalDialog(removal, edits.removeTile),
		Array.isArray(pickingInto)
			? placeCatalogue({ registry, host, onPick: (widgetId) => edits.addTileInto(widgetId, pickingInto), picking })
			: null,
	];
}

function treeElement(
	{ board, width, shared, editing, edits, session, removal, picking, onActions }: SurfaceContext,
	canvasBox: CellSize,
): ReactElement {
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

interface SettingsAt {
	readonly configured: Tile;
	readonly held: SettingsTile;
	readonly canvasBox: CellSize;
}

function settingsElement(
	{ board, width, host, registry, refs, shared, edits, session }: SurfaceContext,
	{ configured, held, canvasBox }: SettingsAt,
): ReactElement {
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

function removalDialog(removal: Removal, removeTile: (id: string) => void): ReactElement {
	const removing = removal.id;
	return h(ConfirmDialog, {
		key: "removal",
		isOpen: removing !== null,
		title: "Remove this widget?",
		description: "It leaves the board and its settings go with it.",
		confirmLabel: "Remove",
		onConfirm: () => {
			if (removing !== null) removeTile(removing);
			removal.set(null);
		},
		onOpenChange: () => removal.set(null),
	});
}

interface PlaceAsk {
	readonly registry: BoardRegistry;
	readonly host: SurfaceHost;
	readonly onPick: (widgetId: string) => void;
	readonly picking: Picking;
}

function placeCatalogue({ registry, host, onPick, picking }: PlaceAsk): ReactElement {
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
