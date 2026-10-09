import type { ProjectRoute } from "./project-entry.js";
import { joinProjectPath, relativePathOf, type ProjectFiles } from "./project-files.js";
import { namesIn, walkProject, type WalkedFolder } from "./project-walk.js";

export const ROUTE_FILE = "board.json";
export const LAYOUT_FILE = "layout.board.json";

const INDEX_SEGMENT = "index";
const PARAM_SEGMENT = /^\[([^\]]+)\]$/;

export async function discoverRoutes(files: ProjectFiles, root: string): Promise<ProjectRoute[]> {
	const folders = await walkProject(files, root);
	return folders.filter((folder) => namesIn(folder).includes(ROUTE_FILE)).map((folder) => routeOf(root, folder));
}

export function routePathOf(folderInRoutes: string): string {
	const segments = folderInRoutes.split("/").filter((segment) => segment !== "" && segment !== INDEX_SEGMENT);
	return `/${segments.map((segment) => segment.replace(PARAM_SEGMENT, ":$1")).join("/")}`;
}

function routeOf(root: string, folder: WalkedFolder): ProjectRoute {
	const inRoutes = relativePathOf(root, folder.path);
	return {
		path: routePathOf(inRoutes),
		file: joinProjectPath(folder.path, ROUTE_FILE),
		params: inRoutes.split("/").flatMap((segment) => PARAM_SEGMENT.exec(segment)?.slice(1, 2) ?? []),
		layout: namesIn(folder).includes(LAYOUT_FILE) ? joinProjectPath(folder.path, LAYOUT_FILE) : null,
	};
}
