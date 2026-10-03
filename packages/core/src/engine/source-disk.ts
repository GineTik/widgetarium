import { RECORD_FILES } from "./catalogue-index.js";
import {
	JAVASCRIPT_SOURCE_FILES,
	LIB_FILES,
	SHEET_FILES,
	SOURCE_FILES,
	javascriptSourceRefusal,
	widgetModulesUnder,
} from "./widget-build.js";
import { contentHash } from "./content-hash.js";

export interface SourceDisk {
	exists(path: string): Promise<boolean>;
	read(path: string): Promise<string>;
	folders(path: string): Promise<string[]>;
	files?: (path: string) => Promise<string[]>;
}

export type HeldFiles = Record<string, string>;

export const WIDGET_FILES: readonly string[] = [...RECORD_FILES, ...SOURCE_FILES, ...SHEET_FILES];
export const SCOPE_FILES: readonly string[] = [...LIB_FILES, "tokens.css", "theme.css"];
export const WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS = "local";

export function stampOf(files: Readonly<Record<string, string>> | null | undefined): string {
	const held = files ?? {};
	return contentHash(
		Object.keys(held)
			.sort()
			.map((name) => `${name}:${held[name]}`)
			.join("\n"),
	);
}

export function scopeOf(folder: string): string {
	return folder.slice(0, folder.lastIndexOf("/"));
}

export function isScopeFolder(folder: string): boolean {
	return folder.slice(folder.lastIndexOf("/") + 1).startsWith("@");
}

export async function filesUnder(disk: SourceDisk, folder: string, names: readonly string[]): Promise<HeldFiles> {
	const held: HeldFiles = {};
	for (const name of names) {
		const at = `${folder}/${name}`;
		if (await disk.exists(at)) held[name] = await disk.read(at);
	}
	return held;
}

// TRADE-OFF: a door that cannot list files is offered the fixed names alone; every door the plugin builds lists them
export async function modulesAt(disk: SourceDisk, folder: string): Promise<string[]> {
	const listFiles = disk.files;
	if (typeof listFiles !== "function") return [];
	return widgetModulesUnder(folder, async (at) => ({
		files: await listFiles.call(disk, at),
		folders: await disk.folders(at),
	}));
}

export async function widgetFilesAt(disk: SourceDisk, folder: string): Promise<HeldFiles> {
	return filesUnder(disk, folder, [...new Set([...WIDGET_FILES, ...(await modulesAt(disk, folder))])]);
}

export async function javascriptNamesAt(disk: SourceDisk, folder: string): Promise<string[]> {
	return Object.keys(await filesUnder(disk, folder, JAVASCRIPT_SOURCE_FILES));
}

export async function sayJavascriptRefused(disk: SourceDisk, folder: string): Promise<null> {
	const refusal = javascriptSourceRefusal(await javascriptNamesAt(disk, folder), folder);
	if (refusal) console.error(`[widgetarium] ${refusal}`);
	return null;
}
