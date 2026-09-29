const exportedDefault = (value) => `export default ${JSON.stringify(value)};\n`;

async function widgetsCliModule() {
	const { widgetsCliBundle } = await import("../../apps/obsidian/build.mjs");
	return exportedDefault(await widgetsCliBundle());
}

async function widgetTypesModule() {
	const { widgetTypeFiles } = await import("../widget-types.mjs");
	return exportedDefault(widgetTypeFiles());
}

const VIRTUAL_MODULES = {
	"widgetarium:surface": async () => "export const REACT_SURFACE_SOURCE = null;\n",
	"widgetarium:widgets-cli": widgetsCliModule,
	"widgetarium:widget-types": widgetTypesModule,
};

const built = new Map();

export const isVirtual = (specifier) => specifier in VIRTUAL_MODULES;

export function virtualSource(specifier) {
	if (!built.has(specifier)) built.set(specifier, VIRTUAL_MODULES[specifier]());
	return built.get(specifier);
}
