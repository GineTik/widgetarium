import { parseYaml } from "obsidian";
import type { MarkdownPostProcessorContext } from "obsidian";
import { declaredLabel } from "@widgetarium/core/registry.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";
import { mountKeyFor } from "@widgetarium/core/mount-key.js";
import { findBlocks } from "@widgetarium/core/block-writer.js";
import { blockRefusal } from "@widgetarium/core/version.js";
import { widgetsNamedBy } from "@widgetarium/core/templates.js";
import type { createWantedWidgets } from "@widgetarium/core/engine/widgets-wanted.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { queueWrite } from "./board-writes.js";
import type { WritingPlugin } from "./board-writes.js";
import type { MountContext, SaveBoard } from "./board-mount.js";

export type BlockContext = MountContext &
	Pick<MarkdownPostProcessorContext, "getSectionInfo"> & {
		readonly replaceCode?: unknown;
	};

export interface DrawingPlugin extends WritingPlugin {
	readonly registry: WidgetLookup & { resolveId(id: string): string };
	readonly mounts: Map<unknown, { blockIndex?: number }>;
	readonly wanted?: Pick<ReturnType<typeof createWantedWidgets>, "want"> | null;
	isScreen(sourcePath: string): boolean;
	mount(
		element: HTMLElement,
		board: Board,
		save: SaveBoard,
		screen: boolean,
		context: BlockContext,
		blockKey: string,
	): { blockIndex?: number };
}

export function drawBlock(plugin: DrawingPlugin, source: string, element: HTMLElement, context: BlockContext): void {
	const board = readBoardFrom(plugin, source, element);
	if (!board) return;

	void plugin.wanted?.want(widgetsNamedBy(board.tiles));

	const info = context.getSectionInfo(element);
	const blockIndex = info ? findBlocks(info.text.split("\n")).findIndex((block) => block.start === info.lineStart) : -1;

	const blockKey = mountKeyFor(plugin.mounts.keys(), context.sourcePath, blockIndex);
	const writeIndex = blockIndex >= 0 ? blockIndex : plugin.mounts.get(blockKey)?.blockIndex;

	const save = (next: Board): void => {
		if (writeIndex === undefined) return;
		queueWrite(plugin, {
			sourcePath: context.sourcePath,
			blockIndex: writeIndex,
			board: next,
			editorBlock: {
				replaceCode: context.replaceCode,
				section: () => context.getSectionInfo(element),
			},
		});
	};

	const mounted = plugin.mount(element, board, save, plugin.isScreen(context.sourcePath), context, blockKey);
	if (blockIndex >= 0) mounted.blockIndex = blockIndex;
}

function readBoardFrom(plugin: DrawingPlugin, source: string, element: HTMLElement): Board | null {
	try {
		const parsed: unknown = parseYaml(source) ?? [];
		const refusal = blockRefusal(isObject(parsed) ? parsed : null);
		if (refusal) {
			element.createEl("pre", { text: refusal });
			return null;
		}
		return normalizeBoard(
			parsed,
			(id) => plugin.registry.resolveId(id),
			(id) => declaredLabel(plugin.registry, id),
		);
	} catch (failure) {
		element.createEl("pre", { text: `Widgetarium: cannot read YAML — ${String(failure)}` });
		return null;
	}
}
