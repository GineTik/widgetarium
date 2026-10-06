import { parseYaml } from "obsidian";
import { findBlocks } from "@widgetarium/core/block-writer.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";

export function boardIn(text: string): Board | null {
	const lines = text.split("\n");
	const [block] = findBlocks(lines);
	if (!block) return null;
	try {
		return normalizeBoard(parseYaml(lines.slice(block.start + 1, block.end).join("\n")));
	} catch {
		return null;
	}
}
