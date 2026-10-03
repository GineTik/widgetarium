import CATALOGUE_WIDGETS from "widgetarium:catalogue-widgets";
import { contentHash } from "@widgetarium/core/engine/content-hash.js";
import { SYSTEM_WIDGETS_DIR, WIDGETS_DIR } from "@widgetarium/core/paths.js";
import type { FileStat, RegistryAdapter } from "@widgetarium/core/registry-reading.js";
import type { FolderListing } from "@widgetarium/core/engine/widget-build.js";
import { LAID_MARK_FILE, readLaidMark } from "./ai/agent-files.js";
import type { AgentFilesAdapter } from "./ai/agent-files.js";

const CATALOGUE_SCOPE = "@catalogue";
const SYSTEM_SCOPE_DIR = `${SYSTEM_WIDGETS_DIR}/${CATALOGUE_SCOPE}`;
const LAID_SCOPE_DIR = `${WIDGETS_DIR}/${CATALOGUE_SCOPE}`;
const BUNDLE_MTIME = Number.parseInt(contentHash(JSON.stringify(CATALOGUE_WIDGETS)), 10) || 0;

const SYSTEM_FILES: ReadonlyMap<string, string> = new Map(
	Object.entries(CATALOGUE_WIDGETS).map(([name, text]) => [`${SYSTEM_SCOPE_DIR}/${name}`, text]),
);
const SYSTEM_FOLDERS: ReadonlySet<string> = new Set([...SYSTEM_FILES.keys()].flatMap((path) => foldersAbove(path)));

export function withSystemWidgets(vault: RegistryAdapter): RegistryAdapter {
	return {
		exists: (path) =>
			isSystemPath(path) ? Promise.resolve(SYSTEM_FILES.has(path) || SYSTEM_FOLDERS.has(path)) : vault.exists(path),
		read: (path) => (isSystemPath(path) ? readSystemFile(path) : vault.read(path)),
		list: (path) => (isSystemPath(path) ? Promise.resolve(systemListingOf(path)) : vault.list(path)),
		stat: (path) =>
			isSystemPath(path) ? Promise.resolve(systemStatOf(path)) : (vault.stat?.(path) ?? Promise.resolve(null)),
	};
}

export async function removeLaidCatalogue(adapter: AgentFilesAdapter): Promise<boolean> {
	if ((await readLaidMark(adapter, `${LAID_SCOPE_DIR}/${LAID_MARK_FILE}`)) === null) return false;
	await adapter.rmdir(LAID_SCOPE_DIR, true);
	return true;
}

function isSystemPath(path: string): boolean {
	return path === SYSTEM_WIDGETS_DIR || path.startsWith(`${SYSTEM_WIDGETS_DIR}/`);
}

function readSystemFile(path: string): Promise<string> {
	const text = SYSTEM_FILES.get(path);
	return text === undefined
		? Promise.reject(new Error(`${path} is not one of the plugin's widgets`))
		: Promise.resolve(text);
}

function systemListingOf(folder: string): FolderListing {
	const isChild = (path: string): boolean => path.slice(0, path.lastIndexOf("/")) === folder;
	return {
		files: [...SYSTEM_FILES.keys()].filter(isChild),
		folders: [...SYSTEM_FOLDERS].filter(isChild),
	};
}

function systemStatOf(path: string): FileStat | null {
	const text = SYSTEM_FILES.get(path);
	return text === undefined ? null : { mtime: BUNDLE_MTIME, size: text.length };
}

function foldersAbove(path: string): string[] {
	const parts = path.split("/").slice(0, -1);
	return parts.map((_, at) => parts.slice(0, at + 1).join("/"));
}
