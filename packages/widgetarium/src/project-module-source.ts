import { SOURCE_FILES } from "@widgetarium/core/engine/widget-build.js";
import {
	checkDiscovered,
	discoverProject,
	formatFindings,
	joinProjectPath,
	type ProjectConfig,
	type ProjectFiles,
	type ProjectMap,
} from "@widgetarium/core/project/index.js";

export const PROJECT_MODULE_ID = "virtual:widgetarium/project";

interface ImportedWidget {
	readonly name: string;
	readonly file: string;
}

interface ProjectToImport {
	readonly root: string;
	readonly config: ProjectConfig;
	readonly map: ProjectMap;
	readonly widgets: readonly ImportedWidget[];
}

const NO_WIDGET_SOURCE = "{folder} was found as a widget, but holds no {files}";

export async function projectModuleSourceOf(root: string, files: ProjectFiles, config: ProjectConfig): Promise<string> {
	const map = await discoverProject(files, config);
	const findings = await checkDiscovered(files, map);
	if (findings.length > 0) throw new Error(formatFindings(findings));
	const widgets = await Promise.all(
		map.widgets.map(async ({ name, path }) => ({ name, file: await widgetSourceIn(files, path) })),
	);
	return moduleSourceOf({ root, config, map, widgets });
}

// TODO: import and draw each route's layout.board.json
function moduleSourceOf({ root, config, map, widgets }: ProjectToImport): string {
	const at = (relative: string): string => JSON.stringify(`${root}/${relative}`);
	const imports = [
		...widgets.map(({ file }, index) => `import * as widget${index} from ${at(file)};`),
		...map.handlers.map(({ name, path }, index) => `import { ${name} as handler${index} } from ${at(path)};`),
		...map.routes.map(({ file }, index) => `import board${index} from ${at(file)};`),
	];
	const routes = map.routes.map(
		({ path, params }, index) =>
			`{ path: ${JSON.stringify(path)}, params: ${JSON.stringify(params)}, board: board${index} }`,
	);
	const project = [
		`name: ${JSON.stringify(config.name)}`,
		`routes: [${routes.join(", ")}]`,
		`widgets: { ${widgets.map(({ name }, index) => `${JSON.stringify(name)}: widget${index}`).join(", ")} }`,
		`handlers: { ${map.handlers.map(({ name }, index) => `${JSON.stringify(name)}: handler${index}`).join(", ")} }`,
	];
	return [...imports, `export const project = { ${project.join(", ")} };`, ""].join("\n");
}

async function widgetSourceIn(files: ProjectFiles, folder: string): Promise<string> {
	const listed = await files.list(folder);
	const source = SOURCE_FILES.map((name) => joinProjectPath(folder, name)).find((at) => listed.files.includes(at));
	if (source === undefined)
		throw new Error(NO_WIDGET_SOURCE.replace("{folder}", folder).replace("{files}", SOURCE_FILES.join(" or ")));
	return source;
}
