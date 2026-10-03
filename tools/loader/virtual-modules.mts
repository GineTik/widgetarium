import { widgetsCliBundleSync } from "../../apps/obsidian/build.mts";
import { widgetTypeFiles } from "../widget-types.mts";
import { catalogueWidgetFiles } from "../catalogue-widget-files.mts";
import { packedModuleSource } from "../packed-module.mts";

const VIRTUAL_MODULES: ReadonlyMap<string, () => string> = new Map([
	["widgetarium:surface", () => "export const REACT_SURFACE_SOURCE = null;\n"],
	["widgetarium:widgets-cli", () => packedModuleSource(widgetsCliBundleSync())],
	["widgetarium:widget-types", () => packedModuleSource(widgetTypeFiles())],
	["widgetarium:catalogue-widgets", () => exportedDefault(catalogueWidgetFiles())],
	["widgetarium:build-stamp", () => 'export const BUILD_STAMP = "under-test";\n'],
]);

const built = new Map<string, string>();

export const isVirtual = (specifier: string): boolean => VIRTUAL_MODULES.has(specifier);

export function virtualSource(specifier: string): string {
	const held = built.get(specifier);
	if (held !== undefined) return held;
	const build = VIRTUAL_MODULES.get(specifier);
	if (!build) throw new Error(`no virtual module named ${specifier}`);
	const source = build();
	built.set(specifier, source);
	return source;
}

function exportedDefault(value: unknown): string {
	return `export default ${JSON.stringify(value)};\n`;
}
