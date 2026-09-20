import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { findBlocks } from "../block-writer.js";
import { normalizeBoard } from "../model.js";
import { measuredPathOf } from "../surface-contract.js";

export async function boardOfNote(vault, at) {
	const raw = await rawBoardOfNote(vault, at);
	return raw === null ? null : normalizeBoard(raw);
}

export async function rawBoardOfNote(vault, at) {
	const note = await readFile(join(vault, at), "utf8").catch(() => null);
	if (note === null) {
		console.error(`There is no note at ${at}.`);
		return null;
	}
	const raw = rawBoardIn(note);
	if (raw === null) console.error(`${at} holds no Widgetarium board that can be read.`);
	return raw;
}

export async function measuredOf(vault, at) {
	const text = await readFile(join(vault, measuredPathOf(at)), "utf8").catch(() => null);
	if (text === null) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function rawBoardIn(text) {
	const lines = text.split("\n");
	const [first] = findBlocks(lines);
	if (!first) return null;
	try {
		return parse(lines.slice(first.start + 1, first.end).join("\n")) ?? null;
	} catch {
		return null;
	}
}
