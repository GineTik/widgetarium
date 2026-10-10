declare module "virtual:widgetarium/project" {
	export const project: import("@widgetarium/core/app").WidgetariumProject;
}

declare module "virtual:widgetarium/start" {
	export function startWidgetarium(
		project: import("@widgetarium/core/app").WidgetariumProject,
	): import("react").ReactElement;
}
