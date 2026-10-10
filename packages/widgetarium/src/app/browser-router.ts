import { withPageParams } from "@widgetarium/core/engine/page-params.js";
import type { PageParams } from "@widgetarium/core/engine/page-params.js";
import type { Navigation, NavigationTarget } from "@widgetarium/core/gateway/host.js";
import { matchProjectRoute } from "@widgetarium/core/project/index.js";
import type { ProjectRouteBoard } from "./widgetarium-project.js";

export interface BrowserRouter extends Navigation {
	subscribe(changed: () => void): () => void;
	pathname(): string;
}

interface NavigateOptions {
	readonly target?: NavigationTarget;
	readonly params?: PageParams;
}

const NEW_TAB = "_blank";

export function createBrowserRouter(routes: readonly ProjectRouteBoard[]): BrowserRouter {
	const listeners = new Set<() => void>();
	const arrive = (given: PageParams): void => {
		void writeParamsAt(routes, window.location.pathname, given).then(() => {
			for (const changed of listeners) changed();
		});
	};
	window.addEventListener("popstate", () => arrive({}));
	void writeParamsAt(routes, window.location.pathname, {});
	return routerOver(routes, listeners, arrive);
}

function routerOver(
	routes: readonly ProjectRouteBoard[],
	listeners: Set<() => void>,
	arrive: (given: PageParams) => void,
): BrowserRouter {
	return {
		canNavigate: true,
		resolve: (link) => (matchProjectRoute(routes, pathnameOf(link)) ? link : null),
		navigate: (link, options) => navigateTo(routes, link, options ?? {}, arrive),
		subscribe: (changed) => subscribeTo(listeners, changed),
		pathname: () => window.location.pathname,
	};
}

function subscribeTo(listeners: Set<() => void>, changed: () => void): () => void {
	listeners.add(changed);
	return () => listeners.delete(changed);
}

function navigateTo(
	routes: readonly ProjectRouteBoard[],
	link: string,
	{ target, params }: NavigateOptions,
	arrive: (given: PageParams) => void,
): boolean {
	if (!matchProjectRoute(routes, pathnameOf(link))) return false;
	if (target === "blank") return window.open(link, NEW_TAB) !== null;
	window.history.pushState(null, "", link);
	arrive(params ?? {});
	return true;
}

async function writeParamsAt(routes: readonly ProjectRouteBoard[], pathname: string, given: PageParams): Promise<void> {
	const matched = matchProjectRoute(routes, pathname);
	if (!matched) return;
	await withPageParams(pathname, { ...matched.params, ...given }).catch((failure: unknown) =>
		console.error(`[widgetarium] page parameters of ${pathname} → not written`, failure),
	);
}

function pathnameOf(link: string): string {
	return new URL(link, window.location.origin).pathname;
}
