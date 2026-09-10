import { normalizeBoard, REGIONS } from "./model.js";

const TASK_BOARD = {
	id: "task-board",
	title: "Task board",
	description: "A board picker, a filter and a view picker over a kanban board of your tasks.",
	keywords: ["task", "tasks", "board", "kanban", "project", "columns", "cards", "filter", "views", "page", "screen"],
	board: {
		mode: "expanded",
		tiles: [
			{ id: "boards", widget: "@core/editable-tabs" },
			{
				id: "filter",
				widget: "@core/filter-panel",
				props: {
					tasks: { where: [{ prop: "board", op: "is", value: { ref: "boards/selection" }, fixed: true }] },
				},
			},
			{
				id: "views",
				widget: "@task/view-tabs",
				props: {
					options: { from: "ref", ref: "board/holds" },
					selection: { from: "ref", ref: "board/selection" },
				},
			},
			{
				id: "board",
				widget: "@core/view-group",
				props: { isTabsShown: { from: "typed", value: false } },
				mounts: { holds: [{ name: "Kanban", widget: "@task/kanban-board" }] },
				mounted: {
					Kanban: {
						widget: "@task/kanban-board",
						slots: { card: { widget: "@task/task-card" } },
						props: {
							tasks: {
								where: [
									{ prop: "board", op: "is", value: { ref: "boards/selection" }, fixed: true },
									{ spread: { ref: "filter/chosen" }, fixed: true },
								],
							},
							selection: { from: "ref", ref: "boards/selection" },
						},
					},
				},
			},
		],
		layout: {
			left: [],
			main: [
				[
					{ id: "boards", ratio: 5, height: 56 },
					{ id: "filter", ratio: 4, height: 56 },
					{ id: "views", ratio: 3, height: 56 },
				],
				[{ id: "board", height: 640 }],
			],
			right: [],
		},
	},
};

export const TEMPLATES = [TASK_BOARD];

function widgetsIn(held, found) {
	for (const tile of held) {
		if (tile.widget) found.add(tile.widget);
		widgetsIn(Object.values(tile.slots ?? {}), found);
		widgetsIn(Object.values(tile.mounted ?? {}), found);
	}
	return found;
}

export function templateWidgets(template) {
	return [...widgetsIn(template.board.tiles, new Set())];
}

export function missingWidgets(template, isHeld) {
	return templateWidgets(template).filter((id) => !isHeld(id));
}

export function templateBoard(template) {
	return normalizeBoard(template.board);
}

// TRADE-OFF: a holder of one view is named after the view — the holder is what the file says, the view is what the page shows
function widgetStandingAt(template, cellId) {
	const tile = template.board.tiles.find((held) => held.id === cellId);
	if (!tile) return null;
	const held = Object.values(tile.mounted ?? {});
	return held.length === 1 ? held[0].widget : tile.widget;
}

export function templateSketch(template) {
	const { layout } = templateBoard(template);
	const drawn = (row) => row.map((cell) => ({ ...cell, widget: widgetStandingAt(template, cell.id) }));
	return REGIONS.map((name) => ({ name, rows: layout[name].rows.map(drawn) }));
}
