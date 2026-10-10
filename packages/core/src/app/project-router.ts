import { withPageParams } from "../engine/page-params.js";
import type { PageParams } from "../engine/page-params.js";
import type { Navigation, NavigationTarget } from "../gateway/host.js";
import { matchProjectRoute } from "../project/index.js";
import type { ProjectRouteBoard } from "./widgetarium-project.js";

export type RoutesOf = () => readonly ProjectRouteBoard[];

export interface ProjectRouter extends Navigation {
	pathname(): string;
	subscribe(changed: () => void): () => void;
	paramsKeyOf(pathname: string): string;
}

export interface RouterLocation {
	pathname(): string;
	pathnameOf(link: string): string;
	go(link: string): void;
	openApart(link: string): boolean;
	paramsKeyOf(pathname: string): string;
}

export interface ArrivingRouter {
	readonly router: ProjectRouter;
	arrive(given: PageParams): void;
}

interface NavigateOptions {
	readonly target?: NavigationTarget;
	readonly params?: PageParams;
}

export function createProjectRouter(routesOf: RoutesOf, location: RouterLocation): ArrivingRouter {
	const listeners = new Set<() => void>();
	const arrive = (given: PageParams): void => {
		void writeParamsAt(routesOf(), location, given).then(() => {
			for (const changed of listeners) changed();
		});
	};
	const router: ProjectRouter = {
		canNavigate: true,
		resolve: (link) => (matchProjectRoute(routesOf(), location.pathnameOf(link)) ? link : null),
		navigate: (link, options) => navigateTo(routesOf(), location, link, options ?? {}, arrive),
		subscribe: (changed) => subscribeTo(listeners, changed),
		pathname: () => location.pathname(),
		paramsKeyOf: (pathname) => location.paramsKeyOf(pathname),
	};
	return { router, arrive };
}

function subscribeTo(listeners: Set<() => void>, changed: () => void): () => void {
	listeners.add(changed);
	return () => listeners.delete(changed);
}

function navigateTo(
	routes: readonly ProjectRouteBoard[],
	location: RouterLocation,
	link: string,
	{ target, params }: NavigateOptions,
	arrive: (given: PageParams) => void,
): boolean {
	if (!matchProjectRoute(routes, location.pathnameOf(link))) return false;
	if (target === "blank") return location.openApart(link);
	location.go(link);
	arrive(params ?? {});
	return true;
}

async function writeParamsAt(
	routes: readonly ProjectRouteBoard[],
	location: RouterLocation,
	given: PageParams,
): Promise<void> {
	const pathname = location.pathname();
	const matched = matchProjectRoute(routes, pathname);
	if (!matched) return;
	const keptAt = location.paramsKeyOf(pathname);
	await withPageParams(keptAt, { ...matched.params, ...given }).catch((failure: unknown) =>
		console.error(`[widgetarium] page parameters of ${pathname} at ${keptAt} → not written`, failure),
	);
}
