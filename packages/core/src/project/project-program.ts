import { failureMessage } from "../engine/failure-message.js";
import type { ImportedWidgets } from "../engine/module-registry.js";
import type { ImportedHandlers } from "../engine/project-pack.js";
import { SOURCE_FILES, moduleLoaderProgramOf } from "../engine/widget-build.js";
import { runCode } from "../registry-scope.js";
import type { ProjectMap } from "./discover-project.js";
import type { ProjectConfig } from "./project-config.js";
import type { ProjectFinding } from "./project-finding.js";
import { joinProjectPath, type ProjectFiles } from "./project-files.js";
import { importGraphOf } from "./project-imports.js";

export interface ProjectModules {
	readonly widgets: ImportedWidgets;
	readonly handlers: ImportedHandlers;
	readonly refused: readonly ProjectFinding[];
}

interface WidgetEntry {
	readonly name: string;
	readonly path: string | null;
	readonly folder: string;
}

type LoadModule = (path: string) => unknown;

type Loaded = { readonly module: unknown } | { readonly refused: ProjectFinding };

const NO_LIBS: ReadonlyMap<string, unknown> = new Map();
const NOT_A_LOADER = "the project's modules compiled into something that loads nothing";
const NO_WIDGET_SOURCE = `holds no ${SOURCE_FILES.join(" or ")}`;
const DID_NOT_LOAD = "threw while it loaded: {failure}";
const NOT_EXPORTED = "declares {name}, but its compiled module exports neither {name} nor a default";
const NOTHING_LOADED: ProjectModules = { widgets: {}, handlers: {}, refused: [] };

export async function loadProjectModules(
	files: ProjectFiles,
	config: ProjectConfig,
	map: ProjectMap,
): Promise<ProjectModules> {
	const widgets = await Promise.all(map.widgets.map(async ({ name, path }) => widgetEntryOf(files, name, path)));
	const entries = [...widgets.flatMap(({ path }) => (path ? [path] : [])), ...map.handlers.map(({ path }) => path)];
	const graph = await importGraphOf(files, config.aliases, entries);
	if (graph.refused.length > 0) return { ...NOTHING_LOADED, refused: graph.refused };
	// TODO: draw with the project's kit copy
	const load = runCode(moduleLoaderProgramOf(graph.compiled, graph.resolved), NO_LIBS, null);
	if (!isLoader(load)) return { ...NOTHING_LOADED, refused: [{ path: config.app.name, message: NOT_A_LOADER }] };
	const loadedWidgets = widgets.map((entry) => [entry.name, widgetModuleIn(load, entry)] as const);
	const loadedHandlers = map.handlers.map(({ name, path }) => [name, handlerIn(load, path, name)] as const);
	return {
		widgets: modulesOf(loadedWidgets),
		handlers: modulesOf(loadedHandlers),
		refused: [...loadedWidgets, ...loadedHandlers].flatMap(([, held]) => ("refused" in held ? [held.refused] : [])),
	};
}

async function widgetEntryOf(files: ProjectFiles, name: string, folder: string): Promise<WidgetEntry> {
	const listed = await files.list(folder);
	const path = SOURCE_FILES.map((file) => joinProjectPath(folder, file)).find((at) => listed.files.includes(at));
	return { name, folder, path: path ?? null };
}

function widgetModuleIn(load: LoadModule, { path, folder }: WidgetEntry): Loaded {
	if (path === null) return { refused: { path: folder, message: NO_WIDGET_SOURCE } };
	return loaded(load, path);
}

function handlerIn(load: LoadModule, path: string, name: string): Loaded {
	const held = loaded(load, path);
	if ("refused" in held) return held;
	const handler: unknown = Reflect.get(Object(held.module), name) ?? Reflect.get(Object(held.module), "default");
	if (handler === undefined) return { refused: { path, message: NOT_EXPORTED.replace("{name}", name) } };
	return { module: handler };
}

function loaded(load: LoadModule, path: string): Loaded {
	try {
		return { module: load(path) };
	} catch (failure) {
		return { refused: { path, message: DID_NOT_LOAD.replace("{failure}", failureMessage(failure)) } };
	}
}

function modulesOf(entries: readonly (readonly [string, Loaded])[]): Readonly<Record<string, unknown>> {
	return Object.fromEntries(entries.flatMap(([name, held]) => ("module" in held ? [[name, held.module]] : [])));
}

function isLoader(held: unknown): held is LoadModule {
	return typeof held === "function";
}
