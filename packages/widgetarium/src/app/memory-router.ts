import type { ProjectRouter, RouterLocation, RoutesOf } from "./project-router.js";
import { createProjectRouter } from "./project-router.js";

export interface MemoryRouterStart {
	readonly at: string;
	readonly paramsKeyOf?: (pathname: string) => string;
}

const RESOLVING_ORIGIN = "http://memory.invalid";

export function createMemoryRouter(routesOf: RoutesOf, start: MemoryRouterStart): ProjectRouter {
	const { router, arrive } = createProjectRouter(routesOf, memoryLocationOf(start));
	arrive({});
	return router;
}

function memoryLocationOf({ at, paramsKeyOf }: MemoryRouterStart): RouterLocation {
	const held = { pathname: pathnameAgainst(at, "/") };
	return {
		pathname: () => held.pathname,
		pathnameOf: (link) => pathnameAgainst(link, held.pathname),
		go: (link) => {
			held.pathname = pathnameAgainst(link, held.pathname);
		},
		openApart: () => false,
		paramsKeyOf: paramsKeyOf ?? ((pathname) => pathname),
	};
}

function pathnameAgainst(link: string, current: string): string {
	return new URL(link, `${RESOLVING_ORIGIN}${current}`).pathname;
}
