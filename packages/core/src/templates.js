import { normalizeBoard } from "./model.js";
import { isBox, keptAt, sideOf } from "./tree.js";

const TASK_BOARD = {
	id: "task-board",
	title: "Task board",
	description: "A board picker, a filter and a view picker over a kanban board of your tasks.",
	keywords: ["task", "tasks", "board", "kanban", "project", "columns", "cards", "filter", "views", "page", "screen"],
	board: {
		mode: "expanded",
		tiles: [
			{
				id: "boards",
				widget: "@default/editable-tabs",
				props: { tabs: { from: "vault", path: "Orbitask/Boards", allow: ["list", "create", "update", "remove"] } },
			},
			{
				id: "filter",
				widget: "@default/filter-panel",
				props: {
					tasks: {
						from: "vault",
						path: "Orbitask/Tasks",
						allow: ["list"],
						where: [{ prop: "board", op: "is", value: { ref: "boards/selection" }, fixed: true }],
					},
				},
			},
			{
				id: "views",
				widget: "@default/view-tabs",
				props: {
					options: { from: "ref", ref: "board/holds" },
					selection: { from: "ref", ref: "board/selection" },
				},
			},
			{
				id: "kanban",
				widget: "@default/kanban-board",
				slots: { card: { widget: "@default/task-card" } },
				props: {
					tasks: {
						from: "vault",
						path: "Orbitask/Tasks",
						allow: ["list", "get", "create", "update", "remove"],
						where: [
							{ prop: "board", op: "is", value: { ref: "boards/selection" }, fixed: true },
							{ spread: { ref: "filter/chosen" }, fixed: true },
						],
					},
					boards: { from: "vault", path: "Orbitask/Boards", allow: ["list", "create", "update", "repairIds"] },
					selection: { from: "ref", ref: "boards/selection" },
				},
			},
		],
		layout: {
			dir: "row",
			of: [
				{ dir: "column", collapse: { into: "drawer", toggle: "always" }, of: [] },
				{
					dir: "column",
					keep: true,
					of: [
						{
							dir: "row",
							of: [
								{ id: "boards", ratio: 5, height: 56 },
								{ id: "filter", ratio: 4, height: 56 },
								{ id: "views", ratio: 3, height: 56 },
							],
						},
						{ dir: "swap", id: "board", strip: false, of: [{ id: "kanban", name: "Kanban", height: 640 }] },
					],
				},
				{ dir: "column", collapse: { into: "drawer", toggle: "always" }, of: [] },
			],
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

export function widgetsNamedBy(tiles) {
	return [...widgetsIn(tiles, new Set())];
}

export function templateWidgets(template) {
	return widgetsNamedBy(template.board.tiles);
}

export function templateBoard(template) {
	return normalizeBoard(template.board);
}

function widgetStandingAt(template, cellId) {
	return template.board.tiles.find((held) => held.id === cellId)?.widget ?? null;
}

function cellsIn(node, template) {
	if (isBox(node)) return node.of.flatMap((child) => cellsIn(child, template));
	return [{ ...node, widget: widgetStandingAt(template, node.id) }];
}

export function templateSketch(template) {
	const { layout } = templateBoard(template);
	const keep = keptAt(layout);
	return layout.of.map((region, at) => ({
		name: at === keep ? "main" : sideOf(layout, at),
		rows: (region.of ?? []).map((child) => cellsIn(child, template)),
	}));
}
