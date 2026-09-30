import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { findBlocks } from "@widgetarium/core/block-writer.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";
import { measuredPathOf } from "@widgetarium/core/surface-contract.js";

export async function boardOfNote(vault: string, at: string): Promise<Board | null> {
	const raw = await rawBoardOfNote(vault, at);
	return raw === null ? null : normalizeBoard(raw);
}

export async function rawBoardOfNote(vault: string, at: string): Promise<unknown> {
	const note = await readFile(join(vault, at), "utf8").catch(() => null);
	if (note === null) {
		console.error(`There is no note at ${at}.`);
		return null;
	}
	const raw = rawBoardIn(note);
	if (raw === null) console.error(`${at} holds no Widgetarium board that can be read.`);
	return raw;
}

export async function measuredOf(vault: string, at: string): Promise<unknown> {
	const text = await readFile(join(vault, measuredPathOf(at)), "utf8").catch(() => null);
	if (text === null) return null;
	try {
		const measured: unknown = JSON.parse(text);
		return measured;
	} catch {
		return null;
	}
}

function rawBoardIn(text: string): unknown {
	const lines = text.split("\n");
	const [first] = findBlocks(lines);
	if (!first) return null;
	try {
		const parsed: unknown = parse(lines.slice(first.start + 1, first.end).join("\n"));
		return parsed ?? null;
	} catch {
		return null;
	}
}
