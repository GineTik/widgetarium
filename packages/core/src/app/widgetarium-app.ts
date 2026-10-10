import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { ModuleRegistry } from "../engine/module-registry.js";
import { registerPacks } from "../engine/packs.js";
import { projectPackOf } from "../engine/project-pack.js";
import { matchProjectRoute } from "../project/index.js";
import type { SurfaceHost } from "../surface/use-surface-shared.js";
import { browserHostOf } from "./browser-host.js";
import { createBrowserRouter } from "./browser-router.js";
import type { ProjectRouter } from "./project-router.js";
import { NoRoute } from "./no-route.js";
import { RouteBoard } from "./route-board.js";
import type { ProjectRouteBoard, WidgetariumAppIdentity, WidgetariumProject } from "./widgetarium-project.js";

export type HostOfPathname = (pathname: string) => SurfaceHost;

export interface OpenedApp {
	readonly app: WidgetariumAppIdentity;
	readonly routes: readonly ProjectRouteBoard[];
	readonly registry: ModuleRegistry;
}

export interface StartedProject extends OpenedApp {
	readonly router: ProjectRouter;
	readonly hostOf: HostOfPathname;
}

export interface ProjectStart {
	readonly router?: ProjectRouter;
	readonly hostOf?: HostOfPathname;
}

export interface WidgetariumAppProps {
	readonly project: StartedProject;
}

export function startProject(project: WidgetariumProject, start: ProjectStart = {}): StartedProject {
	return startOpenedProject(openApp(project), start);
}

export function openApp(project: WidgetariumProject): OpenedApp {
	registerPacks(...project.packs, projectPackOf(project.handlers));
	return { app: project.app, routes: project.routes, registry: new ModuleRegistry(project.widgets) };
}

export function startOpenedProject(opened: OpenedApp, start: ProjectStart): StartedProject {
	const router = start.router ?? createBrowserRouter(opened.routes);
	const hostOf = start.hostOf ?? ((pathname: string) => browserHostOf(router, router.paramsKeyOf(pathname)));
	return { ...opened, router, hostOf };
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
		hostOf: project.hostOf,
		route: matched.route,
		pathname,
	});
}
