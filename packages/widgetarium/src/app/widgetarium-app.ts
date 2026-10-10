import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { corePack } from "@widgetarium/pack-core";
import { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { projectPackOf } from "@widgetarium/core/engine/project-pack.js";
import { matchProjectRoute } from "@widgetarium/core/project/index.js";
import { createBrowserRouter } from "./browser-router.js";
import type { BrowserRouter } from "./browser-router.js";
import { NoRoute } from "./no-route.js";
import { RouteBoard } from "./route-board.js";
import type { ProjectRouteBoard, WidgetariumAppIdentity, WidgetariumProject } from "./widgetarium-project.js";

export interface StartedProject {
	readonly app: WidgetariumAppIdentity;
	readonly routes: readonly ProjectRouteBoard[];
	readonly registry: ModuleRegistry;
	readonly router: BrowserRouter;
}

export interface WidgetariumAppProps {
	readonly project: StartedProject;
}

export function startProject(project: WidgetariumProject): StartedProject {
	registerPacks(corePack, projectPackOf(project.handlers));
	return {
		app: project.app,
		routes: project.routes,
		registry: new ModuleRegistry(project.widgets),
		router: createBrowserRouter(project.routes),
	};
}

export function WidgetariumApp({ project }: WidgetariumAppProps): ReactElement {
	const pathname = useSyncExternalStore(project.router.subscribe, project.router.pathname);
	return routeElementOf(project, pathname);
}

export function routeElementOf(project: StartedProject, pathname: string): ReactElement {
	const matched = matchProjectRoute(project.routes, pathname);
	if (!matched) return h(NoRoute, { pathname });
	return h(RouteBoard, {
		key: pathname,
		registry: project.registry,
		router: project.router,
		route: matched.route,
		pathname,
	});
}
