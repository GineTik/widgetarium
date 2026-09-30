import { COLUMN, pathOfLeaf, prune, replaceAt, SWAP } from "./tree.js";
import type { BoardNode, BoxNode } from "./tree.js";
import { widgetKeyOf } from "./engine/widget-ref.js";
import { mountList, mountRows, uniqueName } from "./held-records.js";
import type { MountSpec } from "./held-records.js";
import type { HeldRecord, Tile } from "./board-tiles.js";

export type NameOf = (id: string) => string | null | undefined;

interface TilesAndLayout {
	readonly tiles: readonly Tile[];
	readonly layout: BoxNode;
}

interface View {
	readonly name: string;
	readonly hidden: boolean;
	readonly widget: string;
	readonly record: HeldRecord | null;
	readonly id: string;
}

// TRADE-OFF: a swap box answers to the id of the widget it replaced, because every switcher shipped says `wants: "@default/view-group/holds"` and a box is not a widget to rename
export const VIEW_GROUP = "@default/view-group";
const GROUP_HELD: MountSpec = { was: "views" };

// TRADE-OFF: a group is read into a swap box on every read and never written back as a tile, because a view that holds its own widget's settings inside a mount cannot be carried, resized or bound like the tile it always was
export function swapsFromGroups(board: TilesAndLayout, nameOf: NameOf): TilesAndLayout {
	const groups = board.tiles.filter(
		(tile) => widgetKeyOf(tile.widget) === VIEW_GROUP && pathOfLeaf(board.layout, tile.id),
	);
	if (groups.length === 0) return board;
	const taken = new Set(board.tiles.map((tile) => tile.id));
	const born: Tile[] = [];
	let layout = board.layout;
	for (const group of groups) {
		const views = viewsOfGroup(group, taken, nameOf);
		layout = swapInto(layout, group, views);
		born.push(...views.filter((view) => view.widget !== "").map(tileOfView));
	}
	const gone = new Set(groups.map((tile) => tile.id));
	return { tiles: [...board.tiles.filter((tile) => !gone.has(tile.id)), ...born], layout: prune(layout) };
}

function swapInto(layout: BoxNode, group: Tile, views: readonly View[]): BoxNode {
	const path = pathOfLeaf(layout, group.id);
	if (path === null) return layout;
	return replaceAt(layout, path, swapFromGroup(group, views));
}

function isStripShown(tile: Tile): boolean {
	return (tile.props["isTabsShown"]?.value ?? tile.settings["isTabsShown"]) !== false;
}

function viewsOfGroup(tile: Tile, taken: Set<string>, nameOf: NameOf): View[] {
	return mountRows(mountList(tile, "holds", GROUP_HELD), nameOf).map((row) => {
		const record = tile.mounted[row.name] ?? (row.was ? tile.mounted[row.was] : null) ?? null;
		return {
			name: row.name,
			hidden: row.hidden,
			widget: record?.widget ?? row.widget,
			record,
			id: uniqueName(taken, `${tile.id}:${row.name}`),
		};
	});
}

function nodeOfView(view: View): BoardNode {
	const slot = { name: view.name, ...(view.hidden ? { hidden: true } : {}) };
	if (view.widget === "") return { dir: COLUMN, of: [], ...slot };
	return { id: view.id, ratio: 1, ...slot };
}

function tileOfView(view: View): Tile {
	return {
		id: view.id,
		widget: view.widget,
		settings: view.record?.settings ?? {},
		mounts: view.record?.mounts ?? {},
		props: view.record?.props ?? {},
		slots: view.record?.slots ?? {},
		mounted: view.record?.mounted ?? {},
	};
}

function swapFromGroup(tile: Tile, views: readonly View[]): BoxNode {
	return {
		dir: SWAP,
		id: tile.id,
		...(isStripShown(tile) ? {} : { strip: false }),
		of: views.map(nodeOfView),
	};
}
