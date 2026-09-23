import { readFile, realpath } from "node:fs/promises";
import { join, relative, isAbsolute } from "node:path";
import { readRegistry, REGISTRY_FILE } from "@widgetarium/core/engine/registry-file.js";
import { cardIn } from "./entries.mjs";
import { filesIn } from "./vault-files.mjs";

const GITHUB_REPOSITORY = /github\.com[/:]([^/]+)\/([^/.]+)/;

export async function offeredBySource(source, cardFrom) {
	const read = source.repository ? await fetchedRegistry(source) : await laidRegistry(source);
	if (read === null) return [];
	const found = [];
	for (const row of read.rows) found.push(await offeredRow(row, read, cardFrom));
	return found;
}

async function offeredRow(row, read, cardFrom) {
	const stands = { installed: false, origin: read.origin };
	const folder = await insideItsSource(read, row);
	if (folder === null) return cardFrom(row, row.id, stands);
	const card = await cardIn(folder);
	return cardFrom({ ...row, ...card }, row.id, { ...stands, folder, files: await filesIn(folder) });
}

async function insideItsSource(read, row) {
	if (read.folderOf === null) return null;
	const named = read.folderOf(row);
	const real = await realpath(named).catch(() => null);
	const root = await realpath(read.origin).catch(() => null);
	if (real === null || root === null) return null;
	if (stepsInside(root, real)) return named;
	console.error(`${row.id} resolves to ${real}, which is outside ${root}, so it is not offered here.`);
	return null;
}

function stepsInside(root, real) {
	const step = relative(root, real);
	return step !== "" && !step.startsWith("..") && !isAbsolute(step);
}

async function laidRegistry(source) {
	const at = join(source.path, REGISTRY_FILE);
	const rows = rowsIn(await readFile(at, "utf8").catch(() => null), at);
	if (rows === null) return null;
	return { rows, origin: source.path, folderOf: (row) => join(source.path, ...row.id.split("/")) };
}

async function fetchedRegistry(source) {
	const named = String(source.repository ?? "").match(GITHUB_REPOSITORY);
	if (!named) return null;
	const at = `https://raw.githubusercontent.com/${named[1]}/${named[2]}/${source.ref ?? "HEAD"}/${REGISTRY_FILE}`;
	const rows = rowsIn(await fetchedText(at), at);
	if (rows === null) return null;
	return { rows, origin: source.repository, folderOf: null };
}

function rowsIn(text, at) {
	if (text === null) {
		console.error(`${at} could not be read, so nothing it may serve is offered here.`);
		return null;
	}
	const read = readRegistry(text, at);
	if (read.refusal === null) return read.rows;
	console.error(read.refusal);
	return null;
}

function fetchedText(at) {
	return fetch(at)
		.then((answer) => (answer.ok ? answer.text() : null))
		.catch(() => null);
}
