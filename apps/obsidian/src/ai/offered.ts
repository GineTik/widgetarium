import { readFile, realpath } from "node:fs/promises";
import { join, relative, isAbsolute } from "node:path";
import { readRegistry, REGISTRY_FILE } from "@widgetarium/core/engine/registry-file.js";
import type { RegistryRow } from "@widgetarium/core/engine/registry-file.js";
import { cardIn } from "./entries.js";
import { widgetFilesIn } from "./vault-files.js";
import type { CardFrom, WidgetEntry } from "./widget-entry.js";

export interface CatalogueSource {
	readonly repository: string | undefined;
	readonly path: string | undefined;
	readonly ref: string | undefined;
}

interface RegistryRead {
	readonly rows: readonly RegistryRow[];
	readonly origin: string;
	readonly folderOf: ((row: RegistryRow) => string) | null;
}

const GITHUB_REPOSITORY = /github\.com[/:]([^/]+)\/([^/.]+)/;

export async function offeredBySource(source: CatalogueSource, cardFrom: CardFrom): Promise<WidgetEntry[]> {
	const read = source.repository
		? await fetchRegistry(source.repository, source.ref)
		: await readRegistryOnDisk(source);
	if (read === null) return [];
	const found: WidgetEntry[] = [];
	for (const row of read.rows) found.push(await offeredRow(row, read, cardFrom));
	return found;
}

async function offeredRow(row: RegistryRow, read: RegistryRead, cardFrom: CardFrom): Promise<WidgetEntry> {
	const stands = { installed: false, origin: read.origin };
	const folder = await insideItsSource(read, row);
	if (folder === null) return cardFrom(row, row.id, stands);
	const card = await cardIn(folder);
	return cardFrom({ ...row, ...(typeof card === "object" ? card : {}) }, row.id, {
		...stands,
		folder,
		files: await widgetFilesIn(folder),
	});
}

async function insideItsSource(read: RegistryRead, row: RegistryRow): Promise<string | null> {
	if (read.folderOf === null) return null;
	const named = read.folderOf(row);
	const real = await realpath(named).catch(() => null);
	const root = await realpath(read.origin).catch(() => null);
	if (real === null || root === null) return null;
	if (stepsInside(root, real)) return named;
	console.error(`${row.id} resolves to ${real}, which is outside ${root}, so it is not offered here.`);
	return null;
}

function stepsInside(root: string, real: string): boolean {
	const step = relative(root, real);
	return step !== "" && !step.startsWith("..") && !isAbsolute(step);
}

async function readRegistryOnDisk(source: CatalogueSource): Promise<RegistryRead | null> {
	const { path } = source;
	if (path === undefined) return null;
	const at = join(path, REGISTRY_FILE);
	const rows = rowsIn(await readFile(at, "utf8").catch(() => null), at);
	if (rows === null) return null;
	return { rows, origin: path, folderOf: (row) => join(path, ...row.id.split("/")) };
}

async function fetchRegistry(repository: string, ref: string | undefined): Promise<RegistryRead | null> {
	const named = repository.match(GITHUB_REPOSITORY);
	if (!named) return null;
	const at = `https://raw.githubusercontent.com/${named[1]}/${named[2]}/${ref ?? "HEAD"}/${REGISTRY_FILE}`;
	const rows = rowsIn(await fetchText(at), at);
	if (rows === null) return null;
	return { rows, origin: repository, folderOf: null };
}

function rowsIn(text: string | null, at: string): readonly RegistryRow[] | null {
	if (text === null) {
		console.error(`${at} could not be read, so nothing it may serve is offered here.`);
		return null;
	}
	const read = readRegistry(text, at);
	if (read.refusal === null) return read.rows;
	console.error(read.refusal);
	return null;
}

function fetchText(at: string): Promise<string | null> {
	return fetch(at)
		.then((answer) => (answer.ok ? answer.text() : null))
		.catch(() => null);
}
