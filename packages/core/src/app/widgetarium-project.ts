import type { ImportedWidgets } from "../engine/module-registry.js";
import type { Pack } from "../engine/packs.js";
import type { ImportedHandlers } from "../engine/project-pack.js";

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
	readonly packs: readonly Pack[];
}
