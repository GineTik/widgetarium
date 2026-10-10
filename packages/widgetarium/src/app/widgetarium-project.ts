import type { ImportedWidgets } from "@widgetarium/core/engine/module-registry.js";
import type { ImportedHandlers } from "@widgetarium/core/engine/project-pack.js";

export interface ProjectRouteBoard {
	readonly path: string;
	readonly params: readonly string[];
	readonly board: unknown;
}

export interface WidgetariumAppIdentity {
	readonly name: string;
	readonly iconHref: string;
}

export interface WidgetariumProject {
	readonly app: WidgetariumAppIdentity;
	readonly routes: readonly ProjectRouteBoard[];
	readonly widgets: ImportedWidgets;
	readonly handlers: ImportedHandlers;
}
