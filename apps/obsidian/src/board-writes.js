import { parseYaml, stringifyYaml, TFile } from "obsidian";
import { placedIds, serializeBoard } from "@widgetarium/core/model.js";
import { trace } from "@widgetarium/core/trace.js";
import { replaceBlock, writeInEditor } from "@widgetarium/core/block-writer.js";

const WRITE_SETTLE_MS = 400;

export function queueWrite(plugin, sourcePath, blockIndex, board, editorBlock) {
	if (blockIndex < 0) return;
	plugin.pending ??= new Map();
	plugin.pending.set(`${sourcePath}#${blockIndex}`, { sourcePath, blockIndex, board, editorBlock });

	clearTimeout(plugin.writeTimer);
	plugin.writeTimer = setTimeout(() => {
		plugin.writing ??= Promise.resolve();
		plugin.writing = plugin.writing.then(() => plugin.flushWrites()).catch((failure) => console.error(failure));
	}, WRITE_SETTLE_MS);
}

export async function flushWrites(plugin) {
	const jobs = [...plugin.pending.entries()];
	plugin.pending.clear();
	plugin.inFlight ??= new Set();
	for (const [key] of jobs) plugin.inFlight.add(key);

	for (const [key, job] of jobs) {
		try {
			await plugin.writeBlock(job);
		} catch (failure) {
			console.error(`[widgetarium] the board in ${key} was not written`, failure);
		} finally {
			plugin.inFlight.delete(key);
		}
	}
}

export async function writeBlock(plugin, job) {
	const block = `${job.sourcePath}#${job.blockIndex}`;
	const body = stringifyYaml(serializeBoard(job.board));
	const holdsEveryTile = (written) => parseYaml(written)?.tiles?.length === job.board.tiles.length;
	if (!holdsEveryTile(body)) {
		console.error(`[widgetarium] write to ${block} cancelled: the serialized board lost tiles`);
		return;
	}
	const through = writeInEditor(job.editorBlock, body) ? "editor" : "file";
	trace("write", { block, tiles: job.board.tiles.length, placed: placedIds(job.board).size, through });
	if (through === "file") await writeFileBlock(plugin, job, body, holdsEveryTile);
}

export function hasPendingWrite(plugin, blockKey) {
	if (!blockKey) return false;
	return Boolean(plugin.pending?.has(blockKey)) || Boolean(plugin.inFlight?.has(blockKey));
}

async function writeFileBlock(plugin, job, body, holdsEveryTile) {
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
