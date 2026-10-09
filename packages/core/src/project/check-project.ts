import { discoverProject, type ProjectMap } from "./discover-project.js";
import { PROJECT_CONFIG_FILE, readProjectConfig } from "./project-config.js";
import type { ProjectEntry, ProjectRoute } from "./project-entry.js";
import type { ProjectFinding } from "./project-finding.js";
import type { ProjectFiles } from "./project-files.js";
import { parseJson } from "./project-json.js";

export async function checkProject(files: ProjectFiles): Promise<ProjectFinding[]> {
	const reading = await readProjectConfig(files);
	if ("refusal" in reading) return [{ path: PROJECT_CONFIG_FILE, message: reading.refusal }];
	return checkDiscovered(files, await discoverProject(files, reading.config));
}

export async function checkDiscovered(files: ProjectFiles, map: ProjectMap): Promise<ProjectFinding[]> {
	return [...map.refused, ...duplicatesIn(map), ...(await unreadableBoardsIn(files, map.routes))];
}

function duplicatesIn(map: ProjectMap): ProjectFinding[] {
	const routes = map.routes.map(({ path, file }) => ({ name: path, path: file }));
	return [
		...duplicatesOf(map.widgets, "widget id"),
		...duplicatesOf(map.kit, "kit item"),
		...duplicatesOf(map.handlers, "handler"),
		...duplicatesOf(map.schemas, "schema"),
		...duplicatesOf(routes, "route"),
	];
}

function duplicatesOf(entries: readonly ProjectEntry[], kind: string): ProjectFinding[] {
	const entriesByName = new Map<string, ProjectEntry[]>();
	for (const entry of entries) entriesByName.set(entry.name, [...(entriesByName.get(entry.name) ?? []), entry]);
	return [...entriesByName].flatMap(([name, held]) => {
		const [first] = held;
		if (!first || held.length < 2) return [];
		const paths = held.map(({ path }) => path).join(", ");
		return [{ path: first.path, message: `${kind} "${name}" is declared ${held.length} times: ${paths}` }];
	});
}

async function unreadableBoardsIn(files: ProjectFiles, routes: readonly ProjectRoute[]): Promise<ProjectFinding[]> {
	const boards = [...new Set(routes.flatMap(({ file, layout }) => (layout === null ? [file] : [file, layout])))];
	const read = await Promise.all(boards.map(async (path) => ({ path, text: await files.read(path) })));
	return read.flatMap(({ path, text }) => {
		if (text === null) return [{ path, message: "vanished while the project was being read" }];
		const json = parseJson(text);
		return "error" in json ? [{ path, message: `is not valid JSON: ${json.error}` }] : [];
	});
}
