import { readdir, readFile, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import { widgetModulesUnder } from "@widgetarium/core/engine/widget-build.js";
import type { FolderListing } from "@widgetarium/core/engine/widget-build.js";

export async function readJson(at: string, fallback: unknown): Promise<unknown> {
	try {
		const read: unknown = JSON.parse(await readFile(at, "utf8"));
		return read;
	} catch {
		return fallback;
	}
}

export async function foldersIn(at: string): Promise<string[]> {
	const found: string[] = [];
	for (const entry of await readdirOf(at)) {
		const full = join(at, entry.name);
		if (entry.isDirectory() || (entry.isSymbolicLink() && (await pointsAt(full, "folder")))) found.push(full);
	}
	return found;
}

export async function filesIn(at: string): Promise<string[]> {
	const found: string[] = [];
	for (const entry of await readdirOf(at)) {
		if (entry.isFile() || (entry.isSymbolicLink() && (await pointsAt(join(at, entry.name), "file"))))
			found.push(entry.name);
	}
	return found;
}

export async function widgetFilesIn(folder: string): Promise<string[]> {
	return [...new Set([...(await filesIn(folder)), ...(await widgetModulesUnder(folder, listFolder))])];
}

export async function listFolder(at: string): Promise<FolderListing> {
	return { files: (await filesIn(at)).map((name) => join(at, name)), folders: await foldersIn(at) };
}

async function readdirOf(at: string): Promise<Dirent[]> {
	try {
		return await readdir(at, { withFileTypes: true });
	} catch {
		return [];
	}
}

// TRADE-OFF: a Dirent describes the link, never its target, so a linked scope has to be stat-ed to be seen at all
async function pointsAt(at: string, kind: "folder" | "file"): Promise<boolean> {
	try {
		const held = await stat(at);
		return kind === "folder" ? held.isDirectory() : held.isFile();
	} catch {
		return false;
	}
}
