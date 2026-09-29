import { COLUMN, pathOfLeaf, prune, replaceAt, SWAP } from "./tree.js";
import { widgetKeyOf } from "./engine/widget-ref.js";
import { mountList, mountRows, uniqueName } from "./held-records.js";

// TRADE-OFF: a swap box answers to the id of the widget it replaced, because every switcher shipped says `wants: "@default/view-group/holds"` and a box is not a widget to rename
export const VIEW_GROUP = "@default/view-group";
const GROUP_HELD = { was: "views" };

// TRADE-OFF: a group is read into a swap box on every read and never written back as a tile, because a view that holds its own widget's settings inside a mount cannot be carried, resized or bound like the tile it always was
export function swapsFromGroups(board, nameOf) {
	const groups = board.tiles.filter(
		(tile) => widgetKeyOf(tile.widget) === VIEW_GROUP && pathOfLeaf(board.layout, tile.id),
	);
	if (groups.length === 0) return board;
	const taken = new Set(board.tiles.map((tile) => tile.id));
	const born = [];
	let layout = board.layout;
	for (const group of groups) {
		const views = viewsOfGroup(group, taken, nameOf);
		layout = replaceAt(layout, pathOfLeaf(layout, group.id), swapFromGroup(group, views));
		born.push(...views.filter((view) => view.widget !== "").map(tileOfView));
	}
	const gone = new Set(groups.map((tile) => tile.id));
	return { tiles: [...board.tiles.filter((tile) => !gone.has(tile.id)), ...born], layout: prune(layout) };
}

function isStripShown(tile) {
	return (tile.props?.isTabsShown?.value ?? tile.settings?.isTabsShown) !== false;
}

function viewsOfGroup(tile, taken, nameOf) {
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

function nodeOfView(view) {
	const slot = { name: view.name, ...(view.hidden ? { hidden: true } : {}) };
	if (view.widget === "") return { dir: COLUMN, of: [], ...slot };
	return { id: view.id, ratio: 1, ...slot };
}

function tileOfView(view) {
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

function swapFromGroup(tile, views) {
	return {
		dir: SWAP,
		id: tile.id,
		...(isStripShown(tile) ? {} : { strip: false }),
		of: views.map(nodeOfView),
	};
}
