import { parseYaml } from "obsidian";
import { findBlocks } from "@widgetarium/core/block-writer.js";
import CATALOGUE_BOARD_FILE from "../boards/catalogue.md";
import DOCS_BOARD_FILE from "../boards/docs.md";

const NO_BLOCK = "Widgetarium: the shipped board {name} holds no widgetarium block";

export const CATALOGUE_BOARD: unknown = boardInShippedFile("catalogue.md", CATALOGUE_BOARD_FILE);

export const DOCS_BOARD: unknown = boardInShippedFile("docs.md", DOCS_BOARD_FILE);

export function placedWidgetBoard(widget: string): Record<string, unknown> {
	return {
		v: 2,
		tiles: [{ id: "placed", widget, props: {} }],
		layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: "placed", surface: "group" }] }] },
	};
}

function boardInShippedFile(name: string, text: string): unknown {
	const lines = text.split("\n");
	const [block] = findBlocks(lines);
	if (!block) throw new Error(NO_BLOCK.replace("{name}", name));
	return parseYaml(lines.slice(block.start + 1, block.end).join("\n"));
}
