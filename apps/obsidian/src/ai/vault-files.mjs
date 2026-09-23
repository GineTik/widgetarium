import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export async function readJson(at, fallback) {
	try {
		return JSON.parse(await readFile(at, "utf8"));
	} catch {
		return fallback;
	}
}

export async function foldersIn(at) {
	const found = [];
	for (const entry of await readdirOf(at)) {
		const full = join(at, entry.name);
		if (entry.isDirectory() || (entry.isSymbolicLink() && (await pointsAt(full, "folder")))) found.push(full);
	}
	return found;
}

export async function filesIn(at) {
	const found = [];
	for (const entry of await readdirOf(at)) {
		if (entry.isFile() || (entry.isSymbolicLink() && (await pointsAt(join(at, entry.name), "file"))))
			found.push(entry.name);
	}
	return found;
}

async function readdirOf(at) {
	try {
		return await readdir(at, { withFileTypes: true });
	} catch {
		return [];
	}
}

// TRADE-OFF: a Dirent describes the link, never its target, so a linked scope has to be stat-ed to be seen at all
async function pointsAt(at, kind) {
	try {
		const held = await stat(at);
		return kind === "folder" ? held.isDirectory() : held.isFile();
	} catch {
		return false;
	}
}
