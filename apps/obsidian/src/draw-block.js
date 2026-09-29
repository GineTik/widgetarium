import { parseYaml } from "obsidian";
import { declaredName } from "@widgetarium/core/registry.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { mountKeyFor } from "@widgetarium/core/mount-key.js";
import { findBlocks } from "@widgetarium/core/block-writer.js";
import { blockRefusal } from "@widgetarium/core/version.js";
import { widgetsNamedBy } from "@widgetarium/core/templates.js";
import { queueWrite } from "./board-writes.js";

export function drawBlock(plugin, source, element, context) {
	const board = boardReadFrom(plugin, source, element);
	if (!board) return;

	plugin.wanted?.want(widgetsNamedBy(board.tiles));

	const info = context.getSectionInfo(element);
	const blockIndex = info ? findBlocks(info.text.split("\n")).findIndex((block) => block.start === info.lineStart) : -1;

	const blockKey = mountKeyFor(plugin.mounts.keys(), context.sourcePath, blockIndex);
	const writeIndex = blockIndex >= 0 ? blockIndex : plugin.mounts.get(blockKey)?.blockIndex;

	const save = (next) => {
		if (writeIndex === undefined) return;
		queueWrite(plugin, context.sourcePath, writeIndex, next, {
			replaceCode: context.replaceCode,
			section: () => context.getSectionInfo(element),
		});
	};

	const mounted = plugin.mount(element, board, save, plugin.isScreen(context.sourcePath), context, blockKey);
	if (blockIndex >= 0) mounted.blockIndex = blockIndex;
}

function boardReadFrom(plugin, source, element) {
	try {
		const parsed = parseYaml(source) ?? [];
		const refusal = blockRefusal(parsed);
		if (refusal) {
			element.createEl("pre", { text: refusal });
			return null;
		}
		return normalizeBoard(
			parsed,
			(id) => plugin.registry.resolveId(id),
			(id) => declaredName(plugin.registry, id),
		);
	} catch (failure) {
		element.createEl("pre", { text: `Widgetarium: cannot read YAML — ${failure}` });
		return null;
	}
}
