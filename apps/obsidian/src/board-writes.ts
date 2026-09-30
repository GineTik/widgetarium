import { parseYaml, stringifyYaml, TFile } from "obsidian";
import type { App } from "obsidian";
import { placedIds, serializeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";
import { trace } from "@widgetarium/core/trace.js";
import { replaceBlock, writeInEditor } from "@widgetarium/core/block-writer.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";

export type EditorBlock = Parameters<typeof writeInEditor>[0];

export interface WriteJob {
	readonly sourcePath: string;
	readonly blockIndex: number;
	readonly board: Board;
	readonly editorBlock: EditorBlock;
}

export interface WritingPlugin {
	readonly app: Pick<App, "vault">;
	pending?: Map<string, WriteJob>;
	inFlight?: Set<string>;
	writeTimer?: ReturnType<typeof setTimeout>;
	writing?: Promise<void>;
	flushWrites(): Promise<void>;
	writeBlock(job: WriteJob): Promise<void>;
}

export type PendingWrites = Pick<WritingPlugin, "pending" | "inFlight">;

const WRITE_SETTLE_MS = 400;

export function queueWrite(plugin: WritingPlugin, job: WriteJob): void {
	if (job.blockIndex < 0) return;
	plugin.pending ??= new Map();
	plugin.pending.set(`${job.sourcePath}#${job.blockIndex}`, job);

	clearTimeout(plugin.writeTimer);
	plugin.writeTimer = setTimeout(() => {
		plugin.writing ??= Promise.resolve();
		plugin.writing = plugin.writing.then(() => plugin.flushWrites()).catch((failure) => console.error(failure));
	}, WRITE_SETTLE_MS);
}

export async function flushWrites(plugin: WritingPlugin): Promise<void> {
	const jobs = [...(plugin.pending?.entries() ?? [])];
	plugin.pending?.clear();
	const inFlight = (plugin.inFlight ??= new Set());
	for (const [key] of jobs) inFlight.add(key);

	for (const [key, job] of jobs) {
		try {
			await plugin.writeBlock(job);
		} catch (failure) {
			console.error(`[widgetarium] the board in ${key} was not written`, failure);
		} finally {
			inFlight.delete(key);
		}
	}
}

export async function writeBlock(plugin: Pick<WritingPlugin, "app">, job: WriteJob): Promise<void> {
	const block = `${job.sourcePath}#${job.blockIndex}`;
	const body = stringifyYaml(serializeBoard(job.board));
	const holdsEveryTile = (written: string): boolean => tilesIn(parseYaml(written)) === job.board.tiles.length;
	if (!holdsEveryTile(body)) {
		console.error(`[widgetarium] write to ${block} cancelled: the serialized board lost tiles`);
		return;
	}
	const through = writeInEditor(job.editorBlock, body) ? "editor" : "file";
	trace("write", { block, tiles: job.board.tiles.length, placed: placedIds(job.board).size, through });
	if (through === "file") await writeFileBlock(plugin, job, body, holdsEveryTile);
}

export function hasPendingWrite(plugin: PendingWrites, blockKey: string | null | undefined): boolean {
	if (!blockKey) return false;
	return Boolean(plugin.pending?.has(blockKey)) || Boolean(plugin.inFlight?.has(blockKey));
}

function tilesIn(parsed: unknown): number | undefined {
	const tiles = isObject(parsed) ? parsed["tiles"] : undefined;
	return Array.isArray(tiles) ? tiles.length : undefined;
}

async function writeFileBlock(
	plugin: Pick<WritingPlugin, "app">,
	job: WriteJob,
	body: string,
	holdsEveryTile: (written: string) => boolean,
): Promise<void> {
	const file = plugin.app.vault.getAbstractFileByPath(job.sourcePath);
	if (!(file instanceof TFile)) {
		console.error(`[widgetarium] write cancelled: ${job.sourcePath} is no longer a note`);
		return;
	}
	await plugin.app.vault.process(file, (text) => {
		const next = replaceBlock(text, job.blockIndex, body, holdsEveryTile);
		if (next !== null) return next;
		console.error(
			`[widgetarium] write to ${job.sourcePath}#${job.blockIndex} cancelled: block not found or the result would be malformed`,
		);
		return text;
	});
}
