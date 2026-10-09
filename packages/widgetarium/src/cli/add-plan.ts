import { HELD_BY_THE_ENGINE } from "@widgetarium/core/engine/modules.js";
import type { ProjectConfig } from "@widgetarium/core/project/index.js";
import type { CatalogueEntry } from "./catalogue-read.js";
import { CliRefusal } from "./cli-output.js";
import { libraryNameOf, moduleNameOf, withLibAliases, type LibFile, type LibRewrite } from "./lib-imports.js";
import { inWidgetFolder, widgetSourcesOf } from "./widget-sources.js";

export interface PlannedFile {
	readonly at: string;
	readonly text: string;
}

export interface AddPlan {
	readonly entry: CatalogueEntry;
	readonly name: string;
	readonly widgetFolder: string;
	readonly widgetFiles: readonly PlannedFile[];
	readonly libFiles: readonly PlannedFile[];
	readonly dependencies: Readonly<Record<string, string>>;
}

export async function planAdd(entry: CatalogueEntry, config: ProjectConfig, name: string): Promise<AddPlan> {
	const sources = await widgetSourcesOf(entry);
	const libsFolder = `${config.paths.libs}/${libraryNameOf(entry.scope)}`;
	const libsAlias = `${aliasOfFolder(config, config.paths.libs)}/${libraryNameOf(entry.scope)}`;
	const rewrite: LibRewrite = {
		scope: sources.scope,
		libs: sources.libs,
		aliasOf: (lib: LibFile) => `${libsAlias}/${moduleNameOf(lib)}`,
	};
	const widgetFolder = `${config.paths.widgets}/${name}`;
	return {
		entry,
		name,
		widgetFolder,
		widgetFiles: sources.files.map((file) => ({
			at: `${widgetFolder}/${inWidgetFolder(entry, file)}`,
			text: withLibAliases(file, rewrite),
		})),
		libFiles: sources.libs.map((lib) => ({ at: `${libsFolder}/${lib.inLibrary}`, text: withLibAliases(lib, rewrite) })),
		dependencies: dependenciesToAdd(entry.card.dependencies),
	};
}

function aliasOfFolder(config: ProjectConfig, folder: string): string {
	const alias = Object.entries(config.aliases).find(([, target]) => target === folder)?.[0];
	if (alias !== undefined) return alias;
	throw new CliRefusal(`widgetarium.json names no alias for ${folder}; add "aliases": { "@libs": "${folder}" }`);
}

function dependenciesToAdd(declared: Readonly<Record<string, string>>): Record<string, string> {
	return Object.fromEntries(Object.entries(declared).filter(([name]) => !HELD_BY_THE_ENGINE.includes(name)));
}
