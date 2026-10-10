export const START_MODULE_ID = "virtual:widgetarium/start";

const STUDIO_MODE = "studio";

interface Starter {
	readonly entry: string;
	readonly start: string;
	readonly root: string;
	readonly prop: string;
	readonly sheets: readonly string[];
}

const APP_STARTER: Starter = {
	entry: "@widgetarium/core/app",
	start: "startProject",
	root: "WidgetariumApp",
	prop: "project",
	sheets: [],
};

const STUDIO_STARTER: Starter = {
	entry: "widgetarium/studio",
	start: "startStudio",
	root: "WidgetariumStudio",
	prop: "started",
	sheets: ["widgetarium/studio.css"],
};

export function startModuleSourceOf(mode: string): string {
	const { entry, start, root, prop, sheets } = mode === STUDIO_MODE ? STUDIO_STARTER : APP_STARTER;
	return [
		'import { createElement } from "react";',
		...sheets.map((sheet) => `import ${JSON.stringify(sheet)};`),
		`import { ${root}, ${start} } from ${JSON.stringify(entry)};`,
		`export function startWidgetarium(project) { return createElement(${root}, { ${prop}: ${start}(project) }); }`,
		"",
	].join("\n");
}
