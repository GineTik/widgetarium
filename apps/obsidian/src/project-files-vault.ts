import type { DataAdapter } from "obsidian";
import { EMPTY_LISTING, joinProjectPath, relativePathOf, type ProjectFiles } from "@widgetarium/core/project/index.js";

export type ProjectAdapter = Pick<DataAdapter, "list" | "read" | "stat">;

const TRAILING_SLASHES = /\/+$/;

export function vaultProjectFiles(adapter: ProjectAdapter, projectFolder: string): ProjectFiles {
	const root = projectFolder.replace(TRAILING_SLASHES, "");
	const inVault = (at: string): string => joinProjectPath(root, at);
	const inProject = (vaultPath: string): string => relativePathOf(root, vaultPath);
	const kindAt = async (at: string): Promise<string | null> => (await adapter.stat(inVault(at)))?.type ?? null;
	return {
		list: async (folder) => {
			if ((await kindAt(folder)) !== "folder") return EMPTY_LISTING;
			const listed = await adapter.list(inVault(folder));
			return { files: listed.files.map(inProject).sort(), folders: listed.folders.map(inProject).sort() };
		},
		read: async (at) => ((await kindAt(at)) === "file" ? adapter.read(inVault(at)) : null),
		exists: async (at) => (await kindAt(at)) !== null,
	};
}
