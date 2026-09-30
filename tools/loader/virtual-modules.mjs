import { widgetsCliBundleSync } from "../../apps/obsidian/build.mjs";
import { widgetTypeFiles } from "../widget-types.mjs";

const exportedDefault = (value) => `export default ${JSON.stringify(value)};\n`;

const VIRTUAL_MODULES = {
	"widgetarium:surface": () => "export const REACT_SURFACE_SOURCE = null;\n",
	"widgetarium:widgets-cli": () => exportedDefault(widgetsCliBundleSync()),
	"widgetarium:widget-types": () => exportedDefault(widgetTypeFiles()),
};

const built = new Map();

export const isVirtual = (specifier) => specifier in VIRTUAL_MODULES;

export function virtualSource(specifier) {
	if (!built.has(specifier)) built.set(specifier, VIRTUAL_MODULES[specifier]());
	return built.get(specifier);
}
