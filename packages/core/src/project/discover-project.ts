import type { ProjectConfig } from "./project-config.js";
import type { ProjectEntry, ProjectRoute } from "./project-entry.js";
import type { ProjectFinding } from "./project-finding.js";
import type { ProjectFiles } from "./project-files.js";
import { discoverKit } from "./project-kit.js";
import { discoverRoutes } from "./project-routes.js";
import { discoverHandlers, discoverSchemas } from "./project-sources.js";
import { discoverWidgets } from "./project-widgets.js";

export interface ProjectMap {
	readonly widgets: readonly ProjectEntry[];
	readonly kit: readonly ProjectEntry[];
	readonly handlers: readonly ProjectEntry[];
	readonly schemas: readonly ProjectEntry[];
	readonly routes: readonly ProjectRoute[];
	readonly refused: readonly ProjectFinding[];
}

export async function discoverProject(files: ProjectFiles, { paths }: ProjectConfig): Promise<ProjectMap> {
	const [widgets, kit, handlers, schemas, routes] = await Promise.all([
		discoverWidgets(files, paths.widgets),
		discoverKit(files, paths.kit),
		discoverHandlers(files, [paths.logic, paths.sources]),
		discoverSchemas(files, [paths.schemas]),
		discoverRoutes(files, paths.routes),
	]);
	return {
		widgets: widgets.widgets,
		kit,
		handlers: handlers.entries,
		schemas: schemas.entries,
		routes,
		refused: [...widgets.refused, ...handlers.refused, ...schemas.refused],
	};
}
