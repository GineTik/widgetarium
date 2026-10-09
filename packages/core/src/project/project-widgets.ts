import { EVERY_SOURCE_FILE, javascriptSourceRefusal } from "../engine/widget-build.js";
import type { ProjectEntry } from "./project-entry.js";
import type { ProjectFinding } from "./project-finding.js";
import { baseNameOf, type ProjectFiles } from "./project-files.js";
import { namesIn, walkProject, type WalkedFolder } from "./project-walk.js";

export interface DiscoveredWidgets {
	readonly widgets: ProjectEntry[];
	readonly refused: ProjectFinding[];
}

export async function discoverWidgets(files: ProjectFiles, root: string): Promise<DiscoveredWidgets> {
	const folders = await walkProject(files, root, isWidgetFolder);
	const judged = folders
		.filter(isWidgetFolder)
		.map((folder) => ({ path: folder.path, refusal: javascriptSourceRefusal(namesIn(folder), folder.path) }));
	return {
		widgets: judged.flatMap(({ path, refusal }) => (refusal === null ? [{ name: baseNameOf(path), path }] : [])),
		refused: judged.flatMap(({ path, refusal }) => (refusal === null ? [] : [{ path, message: refusal }])),
	};
}

function isWidgetFolder(folder: WalkedFolder): boolean {
	return namesIn(folder).some((name) => EVERY_SOURCE_FILE.includes(name));
}
