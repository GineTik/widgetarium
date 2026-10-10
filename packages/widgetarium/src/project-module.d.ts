declare module "virtual:widgetarium/project" {
	export const project: import("./app.js").WidgetariumProject;
}

declare module "virtual:widgetarium/start" {
	export function startWidgetarium(project: import("./app.js").WidgetariumProject): import("react").ReactElement;
}
