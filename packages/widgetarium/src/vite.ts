import * as fileSystem from "node:fs/promises";
import { PROJECT_CONFIG_FILE, nodeProjectFiles, readProjectConfig } from "@widgetarium/core/project/index.js";
import { viteAliasesOf, type ResolvedAlias } from "./project-aliases.js";

export interface WidgetariumVitePlugin {
	readonly name: string;
	config(): Promise<{ resolve: { alias: ResolvedAlias[] } }>;
}

export function widgetarium(root: string = process.cwd()): WidgetariumVitePlugin {
	return {
		name: "widgetarium",
		config: async () => ({ resolve: { alias: await projectAliasesIn(root) } }),
	};
}

async function projectAliasesIn(root: string): Promise<ResolvedAlias[]> {
	const reading = await readProjectConfig(nodeProjectFiles(root, fileSystem));
	if ("refusal" in reading) throw new Error(`${PROJECT_CONFIG_FILE}: ${reading.refusal}`);
	return viteAliasesOf(reading.config.aliases, root);
}
