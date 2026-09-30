import { columnsOf, keptAt, layRegion, sideOf } from "@widgetarium/core/tree.js";
import { GRID } from "@widgetarium/core/paths.js";
import { boardOfNote } from "./board-note.js";
import { drawnNode } from "./drawn-node.js";
import { VAULT } from "./cli-paths.js";
import { installedWidgets } from "./catalogue-entries.js";

export interface LayoutAnswer {
	readonly value: {
		readonly note: string;
		readonly width: number;
		readonly tiles: number;
		readonly regions: number;
		readonly tree: string[];
	};
	readonly text: string;
}

const DEFAULT_BOARD_WIDTH = 1400;

export async function layoutOfNote(at: string, askedWidth: unknown): Promise<LayoutAnswer | null> {
	const board = await boardOfNote(VAULT, at);
	if (board === null) return null;

	const width = Number(askedWidth) || DEFAULT_BOARD_WIDTH;
	const root = board.layout;
	const keep = keptAt(root);
	const where = columnsOf(root, width);
	const cards = await installedWidgets();
	const widgetOf = (id: string): string | undefined => board.tiles.find((tile) => tile.id === id)?.widget;
	const ask = (id: string): { widget: string | undefined; role: string | undefined } => ({
		widget: widgetOf(id),
		role: cards.find((card) => card.id === widgetOf(id))?.role ?? undefined,
	});
	const nameOf = (index: number): string => (index === keep ? "main" : sideOf(root, index));
	const named = (index: number): string => `${nameOf(index)}[${index}]`;

	const tree: string[] = [];
	for (const column of where.beside) {
		tree.push(named(column.at));
		tree.push(drawnNode(layRegion(root, column.at, column.width, { ask }).node, 1));
	}

	const head = [
		`${at} at ${width}px: ${board.tiles.length} tiles, ${root.of.length} regions, cell ${GRID.cellPx}px`,
		`beside: ${where.beside.map((one) => `${named(one.at)} ${Math.round(one.width)}px`).join(", ") || "none"}`,
		`floating: ${where.floating.map(named).join(", ") || "none"}`,
		`hidden: ${where.hidden.map(named).join(", ") || "none"}`,
	];
	return {
		value: { note: at, width, tiles: board.tiles.length, regions: root.of.length, tree },
		text: [...head, ...tree].join("\n"),
	};
}
