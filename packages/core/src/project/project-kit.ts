import type { ProjectEntry } from "./project-entry.js";
import { TYPESCRIPT_MODULE, baseNameOf, isAuthoredModule, relativePathOf, type ProjectFiles } from "./project-files.js";
import { filesUnder } from "./project-walk.js";

export const KIT_HELPER_FOLDERS: readonly string[] = ["utils", "hooks", "constants"];

const KIT_BARREL = "index.ts";

export async function discoverKit(files: ProjectFiles, root: string): Promise<ProjectEntry[]> {
	const paths = await filesUnder(files, root);
	return paths
		.filter((path) => isKitItem(relativePathOf(root, path)))
		.map((path) => ({ name: baseNameOf(path).replace(TYPESCRIPT_MODULE, ""), path }));
}

export function isKitItem(pathInKit: string): boolean {
	if (!isAuthoredModule(pathInKit) || baseNameOf(pathInKit) === KIT_BARREL) return false;
	return !pathInKit
		.split("/")
		.slice(0, -1)
		.some((folder) => KIT_HELPER_FOLDERS.includes(folder));
}
