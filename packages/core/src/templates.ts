import { normalizeBoard } from "./model.js";
import type { Board } from "./model.js";
import type { TileProp } from "./board-tiles.js";
import { isBox, keptAt, sideOf } from "./tree.js";
import type { BoardNode, LeafNode, ScreenSide } from "./tree.js";

interface TemplateNode {
	readonly dir?: string;
	readonly of?: readonly TemplateNode[];
	readonly id?: string;
	readonly name?: string;
	readonly ratio?: number;
	readonly height?: number;
	readonly keep?: boolean;
	readonly strip?: boolean;
	readonly collapse?: { readonly into: string; readonly toggle: string };
}

interface TemplateTile {
	readonly id: string;
	readonly widget: string;
	readonly props?: Readonly<Record<string, TileProp>>;
	readonly slots?: Readonly<Record<string, { readonly widget: string }>>;
}

interface TemplateBoard {
	readonly mode: string;
	readonly tiles: readonly TemplateTile[];
	readonly layout: TemplateNode;
}

export interface Template {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly keywords: readonly string[];
	readonly board: TemplateBoard;
}

interface WidgetHolder {
	readonly widget?: string | undefined;
	readonly slots?: Readonly<Record<string, WidgetHolder>> | null | undefined;
	readonly mounted?: Readonly<Record<string, WidgetHolder>> | null | undefined;
}

export interface SketchCell extends LeafNode {
	readonly widget: string | null;
}

export interface SketchRegion {
	readonly name: ScreenSide | "main";
	readonly rows: readonly SketchCell[][];
}

const TASK_BOARD: Template = {
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
				props: { getTabs: { from: "vault", path: "Orbitask/Boards", allow: ["list", "create", "update", "remove"] } },
			},
			{
				id: "filter",
				widget: "@default/filter-panel",
				props: {
					getTasks: { from: "vault", path: "Orbitask/Tasks", allow: ["list"] },
					getBoard: { from: "ref", ref: "boards/getSelection" },
				},
			},
			{
				id: "views",
				widget: "@default/view-tabs",
				props: {
					getOptions: { from: "ref", ref: "board/holds" },
					getSelection: { from: "ref", ref: "board/selection" },
				},
			},
			{
				id: "kanban",
				widget: "@default/kanban-board",
				slots: { card: { widget: "@default/task-card" } },
				props: {
					getTasks: { from: "vault", path: "Orbitask/Tasks", allow: ["list", "get", "create", "update", "remove"] },
					getChosen: { from: "ref", ref: "filter/getChosen" },
					getBoards: { from: "vault", path: "Orbitask/Boards", allow: ["list", "create", "update", "repairIds"] },
					getSelection: { from: "ref", ref: "boards/getSelection" },
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

export const TEMPLATES: readonly Template[] = [TASK_BOARD];

export function widgetsNamedBy(tiles: readonly WidgetHolder[]): string[] {
	return [...widgetsIn(tiles, new Set())];
}

export function templateWidgets(template: Template): string[] {
	return widgetsNamedBy(template.board.tiles);
}

export function templateBoard(template: Template): Board {
	return normalizeBoard(template.board);
}

export function templateSketch(template: Template): SketchRegion[] {
	const { layout } = templateBoard(template);
	const keep = keptAt(layout);
	return layout.of.map((region, at) => ({
		name: at === keep ? "main" : sideOf(layout, at),
		rows: (isBox(region) ? region.of : []).map((child) => cellsIn(child, template)),
	}));
}

function widgetsIn(held: readonly WidgetHolder[], found: Set<string>): Set<string> {
	for (const tile of held) {
		if (tile.widget) found.add(tile.widget);
		widgetsIn(Object.values(tile.slots ?? {}), found);
		widgetsIn(Object.values(tile.mounted ?? {}), found);
	}
	return found;
}

function widgetStandingAt(template: Template, cellId: string): string | null {
	return template.board.tiles.find((held) => held.id === cellId)?.widget ?? null;
}

function cellsIn(node: BoardNode, template: Template): SketchCell[] {
	if (isBox(node)) return node.of.flatMap((child) => cellsIn(child, template));
	return [{ ...node, widget: widgetStandingAt(template, node.id) }];
}
