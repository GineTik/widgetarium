import * as fileSystem from "node:fs/promises";
import {
	PROJECT_CONFIG_FILE,
	nodeProjectFiles,
	readProjectConfig,
	type ProjectConfig,
	type ProjectFiles,
} from "@widgetarium/core/project/index.js";
import { viteAliasesOf, type ResolvedAlias } from "./project-aliases.js";
import { PROJECT_MODULE_ID, projectModuleSourceOf } from "./project-module-source.js";

export interface WidgetariumVitePlugin {
	readonly name: string;
	config(): Promise<{ resolve: { alias: ResolvedAlias[] } }>;
	resolveId(id: string): string | null;
	load(id: string): Promise<string | null>;
}

interface ReadProject {
	readonly files: ProjectFiles;
	readonly config: ProjectConfig;
}

const RESOLVED_PROJECT_MODULE = `\0${PROJECT_MODULE_ID}`;

// TODO: refresh the project module in dev when a widget, handler or route is added or removed
export function widgetarium(root: string = process.cwd()): WidgetariumVitePlugin {
	return {
		name: "widgetarium",
		config: async () => ({ resolve: { alias: viteAliasesOf((await projectIn(root)).config.aliases, root) } }),
		resolveId: (id) => (id === PROJECT_MODULE_ID ? RESOLVED_PROJECT_MODULE : null),
		load: async (id) => {
			if (id !== RESOLVED_PROJECT_MODULE) return null;
			const { files, config } = await projectIn(root);
			return projectModuleSourceOf(root, files, config);
		},
	};
}

async function projectIn(root: string): Promise<ReadProject> {
	const files = nodeProjectFiles(root, fileSystem);
	const reading = await readProjectConfig(files);
	if ("refusal" in reading) throw new Error(`${PROJECT_CONFIG_FILE}: ${reading.refusal}`);
	return { files, config: reading.config };
}
