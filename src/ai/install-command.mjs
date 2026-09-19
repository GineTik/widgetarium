import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readLock, lockEntry, withEntry, INSTALL_PENDING } from "../engine/widget-lock.js";
import { SOURCE_FILES } from "../engine/widget-build.js";
import { SCOPE_FILES, WIDGET_FILES, stampOf } from "../engine/widget-source.js";
import { apiRefusal } from "../version.js";

const WIDGET_ID = /^@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/;

export async function installWidget(entry, { widgetsDir, lockPath }) {
	const refused = refusalFor(entry);
	if (refused) return { failure: refused };

	const planned = await whatWouldBeWritten(entry, widgetsDir);
	if (planned.failure) return planned;

	const lock = await lockIn(lockPath);
	if (lock === null)
		return { failure: `${lockPath} is not readable JSON, and nothing is installed over a lock that cannot be read.` };

	const { taken, shared, into, scopeAt, described } = planned;
	await writeLock(lockPath, lock, entry.id, { ...described, state: INSTALL_PENDING });
	await writtenInto(into, taken);
	await writtenInto(scopeAt, shared);
	await writeLock(lockPath, lock, entry.id, described);
	return { failure: null, files: Object.keys(taken), shared: Object.keys(shared), at: into };
}

function refusalFor(entry) {
	if (!WIDGET_ID.test(String(entry.id)))
		return `${entry.id} is not a widget id, and a registry does not get to name a folder outside this vault.`;
	if (!entry.folder)
		return `${entry.id} is offered by a registry this machine cannot read from disk, so it has to be installed from the catalogue window.`;
	if (entry.installed) return `${entry.id} is already installed.`;
	return apiRefusal({ id: entry.id, api: entry.api });
}

async function whatWouldBeWritten(entry, widgetsDir) {
	const taken = await readFrom(entry.folder, WIDGET_FILES);
	if (!SOURCE_FILES.some((file) => file in taken))
		return {
			failure: `${entry.folder} holds no widget source, only ${Object.keys(taken).join(", ") || "nothing"}, so ${entry.id} was not installed.`,
		};

	const [scope, name] = entry.id.split("/");
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

async function lockIn(lockPath) {
	const raw = await readFile(lockPath, "utf8").catch(() => null);
	if (raw === null) return readLock(null);
	try {
		return readLock(JSON.parse(raw));
	} catch {
		return null;
	}
}

async function readFrom(folder, named) {
	const taken = {};
	for (const file of named) {
		const text = await readFile(join(folder, file), "utf8").catch(() => null);
		if (text !== null) taken[file] = text;
	}
	return taken;
}

async function alreadyStanding(into, files) {
	const found = [];
	for (const [file, text] of Object.entries(files)) {
		const standing = await readFile(join(into, file), "utf8").catch(() => null);
		if (standing !== null && standing !== text) found.push(file);
	}
	return found;
}

async function writtenInto(into, files) {
	await mkdir(into, { recursive: true });
	for (const [file, text] of Object.entries(files)) await writeFile(join(into, file), text);
}

// TODO: two processes installing at once still lose an entry; the plugin and this tool need one writer
async function writeLock(lockPath, lock, id, described) {
	const beside = `${lockPath}.${process.pid}`;
	await writeFile(beside, `${JSON.stringify(withEntry(lock, id, lockEntry(described)), null, "\t")}\n`);
	await rename(beside, lockPath);
}
