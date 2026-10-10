import { hostOverRouter } from "../../app/host-over-router.js";
import { createMemoryRouter, createMemoryRouterWithoutArrival } from "../../app/memory-router.js";
import type { ProjectRouter } from "../../app/project-router.js";
import type { StartedProject } from "../../app/widgetarium-app.js";
import type { ProjectRouteBoard } from "../../app/widgetarium-project.js";

const FRAME_PARAMS_KEY = "widgetarium canvas {route} at {pathname}";
// TRADE-OFF: an unfilled frame's router stands at /; a router standing nowhere needs its own constructor
const UNFILLED_STANDS_AT = "/";

export function frameProjectOf(project: StartedProject, route: ProjectRouteBoard): StartedProject {
	const router = frameRouterOf(project, route);
	return { ...project, router, hostOf: hostOverRouter(project.hostOf, router) };
}

function frameRouterOf(project: StartedProject, route: ProjectRouteBoard): ProjectRouter {
	const routesOf = (): readonly ProjectRouteBoard[] => project.routes;
	const paramsKeyOf = (pathname: string): string =>
		FRAME_PARAMS_KEY.replace("{route}", route.path).replace("{pathname}", pathname);
	// TODO: fill a param route from its first sample once a board or config can declare one
	if (route.params.length > 0)
		return createMemoryRouterWithoutArrival(routesOf, { at: UNFILLED_STANDS_AT, paramsKeyOf });
	return createMemoryRouter(routesOf, { at: route.path, paramsKeyOf });
}
