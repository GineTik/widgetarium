import { createMemoryRouter } from "widgetarium/app";
import type { ProjectRouteBoard, ProjectRouter } from "widgetarium/app";
import type { StudioNote } from "./studio-note.js";

export interface StudioRouting {
	routerFor(note: StudioNote, routes: readonly ProjectRouteBoard[]): ProjectRouter;
}

interface HeldRouter {
	readonly note: StudioNote;
	readonly router: ProjectRouter;
}

interface HeldRouting {
	routes: readonly ProjectRouteBoard[];
	current: HeldRouter | null;
}

export function createStudioRouting(paramsKeyOf: (pathname: string) => string): StudioRouting {
	const held: HeldRouting = { routes: [], current: null };
	const routesOf = (): readonly ProjectRouteBoard[] => held.routes;
	return {
		routerFor: (note, routes) => {
			held.routes = routes;
			held.current = routerAt(held.current, note, () => createMemoryRouter(routesOf, { at: note.route, paramsKeyOf }));
			return held.current.router;
		},
	};
}

function routerAt(current: HeldRouter | null, note: StudioNote, createRouter: () => ProjectRouter): HeldRouter {
	if (current === null || current.note.folder !== note.folder) return { note, router: createRouter() };
	if (current.note.route !== note.route) current.router.navigate(note.route);
	return { note, router: current.router };
}
