import type { ImportedWidgets } from "../engine/module-registry.js";
import type { ImportedHandlers } from "../engine/project-pack.js";
import { checkDiscovered } from "./check-project.js";
import { discoverProject, type ProjectMap } from "./discover-project.js";
import { PROJECT_CONFIG_FILE, readProjectConfig, type ProjectConfig } from "./project-config.js";
import type { ProjectRoute } from "./project-entry.js";
import type { ProjectFinding } from "./project-finding.js";
import type { ProjectFiles } from "./project-files.js";
import { parseJson } from "./project-json.js";
import { loadProjectModules } from "./project-program.js";

export interface OpenedRoute {
	readonly path: string;
	readonly params: readonly string[];
	readonly board: unknown;
}

export interface OpenedProject {
	readonly name: string;
	readonly routes: readonly OpenedRoute[];
	readonly widgets: ImportedWidgets;
	readonly handlers: ImportedHandlers;
}

export type ProjectOpening =
	| { readonly ok: true; readonly project: OpenedProject }
	| { readonly ok: false; readonly findings: readonly ProjectFinding[] };

export async function openProject(files: ProjectFiles): Promise<ProjectOpening> {
	const reading = await readProjectConfig(files);
	if ("refusal" in reading) return refused([{ path: PROJECT_CONFIG_FILE, message: reading.refusal }]);
	const map = await discoverProject(files, reading.config);
	const findings = await checkDiscovered(files, map);
	if (findings.length > 0) return refused(findings);
	return openChecked(files, reading.config, map);
}

async function openChecked(files: ProjectFiles, config: ProjectConfig, map: ProjectMap): Promise<ProjectOpening> {
	const [routes, modules] = await Promise.all([routesOf(files, map.routes), loadProjectModules(files, config, map)]);
	if (modules.refused.length > 0) return refused(modules.refused);
	return {
		ok: true,
		project: { name: config.name, routes, widgets: modules.widgets, handlers: modules.handlers },
	};
}

function refused(findings: readonly ProjectFinding[]): ProjectOpening {
	return { ok: false, findings };
}

async function routesOf(files: ProjectFiles, routes: readonly ProjectRoute[]): Promise<OpenedRoute[]> {
	return Promise.all(
		routes.map(async ({ path, params, file }) => {
			const json = parseJson((await files.read(file)) ?? "null");
			return { path, params, board: "value" in json ? json.value : null };
		}),
	);
}
