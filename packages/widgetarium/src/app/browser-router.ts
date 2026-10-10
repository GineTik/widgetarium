import type { ProjectRouter, RouterLocation } from "./project-router.js";
import { createProjectRouter } from "./project-router.js";
import type { ProjectRouteBoard } from "./widgetarium-project.js";

const NEW_TAB = "_blank";

const BROWSER_LOCATION: RouterLocation = {
	pathname: () => window.location.pathname,
	pathnameOf: (link) => new URL(link, window.location.origin).pathname,
	go: (link) => window.history.pushState(null, "", link),
	openApart: (link) => window.open(link, NEW_TAB) !== null,
	paramsKeyOf: (pathname) => pathname,
};

export function createBrowserRouter(routes: readonly ProjectRouteBoard[]): ProjectRouter {
	const { router, arrive } = createProjectRouter(() => routes, BROWSER_LOCATION);
	window.addEventListener("popstate", () => arrive({}));
	arrive({});
	return router;
}
