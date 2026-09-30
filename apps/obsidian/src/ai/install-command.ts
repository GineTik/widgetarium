import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readLock, lockEntry, withEntry, INSTALL_PENDING } from "@widgetarium/core/engine/widget-lock.js";
import type { LockEntryInput, WidgetLock } from "@widgetarium/core/engine/widget-lock.js";
import {
	JAVASCRIPT_SOURCE_FILES,
	SOURCE_FILES,
	javascriptSourceRefusal,
	widgetModulesUnder,
} from "@widgetarium/core/engine/widget-build.js";
import { listFolder } from "./vault-files.js";
import { SCOPE_FILES, WIDGET_FILES, stampOf } from "@widgetarium/core/engine/widget-source.js";
import { apiRefusal } from "@widgetarium/core/version.js";
import type { WidgetEntry } from "./widget-entry.js";

type Texts = Record<string, string>;

export interface InstallPlace {
	readonly widgetsDir: string;
	readonly lockPath: string;
}

export type Installed =
	| { readonly failure: string }
	| { readonly failure: null; readonly files: string[]; readonly shared: string[]; readonly at: string };

interface Described {
	readonly source: string;
	readonly commit: string;
	readonly files: Texts;
}

type Planned =
	| { readonly failure: string }
	| {
			readonly failure: null;
			readonly taken: Texts;
			readonly shared: Texts;
			readonly scopeAt: string;
			readonly into: string;
			readonly described: Described;
	  };

type InstallableEntry = WidgetEntry & { readonly folder: string };

const WIDGET_ID = /^@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/;

export async function installWidget(entry: WidgetEntry, { widgetsDir, lockPath }: InstallPlace): Promise<Installed> {
	const refused = refusalFor(entry);
	if (refused || !entry.folder) return { failure: refused ?? "" };

	const planned = await whatWouldBeWritten({ ...entry, folder: entry.folder }, widgetsDir);
	if (planned.failure !== null) return planned;

	const lock = await lockIn(lockPath);
	if (lock === null)
		return { failure: `${lockPath} is not readable JSON, and nothing is installed over a lock that cannot be read.` };

	const { taken, shared, into, scopeAt, described } = planned;
	await writeLock(lockPath, lock, entry.id, { ...described, state: INSTALL_PENDING });
	await writeInto(into, taken);
	await writeInto(scopeAt, shared);
	await writeLock(lockPath, lock, entry.id, described);
	return { failure: null, files: Object.keys(taken), shared: Object.keys(shared), at: into };
}

function refusalFor(entry: WidgetEntry): string | null {
	if (!WIDGET_ID.test(String(entry.id)))
		return `${entry.id} is not a widget id, and a registry does not get to name a folder outside this vault.`;
	if (!entry.folder)
		return `${entry.id} is offered by a registry this machine cannot read from disk, so it has to be installed from the catalogue window.`;
	if (entry.installed) return `${entry.id} is already installed.`;
	return apiRefusal({ id: entry.id, api: entry.api });
}

async function sourceMissingFailure(entry: InstallableEntry, taken: Texts): Promise<string> {
	const javascriptFiles = Object.keys(await readFrom(entry.folder, JAVASCRIPT_SOURCE_FILES));
	return (
		javascriptSourceRefusal(javascriptFiles, entry.folder) ??
		`${entry.folder} holds no widget source, only ${Object.keys(taken).join(", ") || "nothing"}, so ${entry.id} was not installed.`
	);
}

async function whatWouldBeWritten(entry: InstallableEntry, widgetsDir: string): Promise<Planned> {
	const modules = await widgetModulesUnder(entry.folder, listFolder);
	const taken = await readFrom(entry.folder, [...new Set([...WIDGET_FILES, ...modules])]);
	if (!SOURCE_FILES.some((file) => file in taken)) return { failure: await sourceMissingFailure(entry, taken) };

	const [scope = "", name = ""] = entry.id.split("/");
	const scopeAt = join(widgetsDir, scope);
	const shared = await readFrom(dirname(entry.folder), SCOPE_FILES);
	const standing = await alreadyStanding(scopeAt, shared);
	if (standing.length > 0)
		return {
			failure: `${standing.join(" and ")} already stands in ${scope} with different contents, and installing ${entry.id} would take it from whatever put it there.`,
		};

	const described = { source: entry.origin ?? "", commit: stampOf(taken), files: taken };
	return { failure: null, taken, shared, scopeAt, into: join(scopeAt, name), described };
}

async function lockIn(lockPath: string): Promise<WidgetLock | null> {
	const raw = await readFile(lockPath, "utf8").catch(() => null);
	if (raw === null) return readLock(null);
	try {
		return readLock(JSON.parse(raw));
	} catch {
		return null;
	}
}

async function readFrom(folder: string, named: readonly string[]): Promise<Texts> {
	const taken: Texts = {};
	for (const file of named) {
		const text = await readFile(join(folder, file), "utf8").catch(() => null);
		if (text !== null) taken[file] = text;
	}
	return taken;
}

async function alreadyStanding(into: string, files: Texts): Promise<string[]> {
	const found: string[] = [];
	for (const [file, text] of Object.entries(files)) {
		const standing = await readFile(join(into, file), "utf8").catch(() => null);
		if (standing !== null && standing !== text) found.push(file);
	}
	return found;
}

async function writeInto(into: string, files: Texts): Promise<void> {
	for (const [file, text] of Object.entries(files)) {
		await mkdir(dirname(join(into, file)), { recursive: true });
		await writeFile(join(into, file), text);
	}
}

// TODO: two processes installing at once still lose an entry; the plugin and this tool need one writer
async function writeLock(lockPath: string, lock: WidgetLock, id: string, described: LockEntryInput): Promise<void> {
	const beside = `${lockPath}.${process.pid}`;
	await writeFile(beside, `${JSON.stringify(withEntry(lock, id, lockEntry(described)), null, "\t")}\n`);
	await rename(beside, lockPath);
}
