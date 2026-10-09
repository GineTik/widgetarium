import { withPageParams } from "@widgetarium/core/engine/page-params.js";
import type { PageParams } from "@widgetarium/core/engine/page-params.js";
import type { Navigation, NavigationTarget } from "@widgetarium/core/gateway/host.js";
import type { ProjectRouteBoard } from "./widgetarium-project.js";

export interface RouteMatch {
	readonly route: ProjectRouteBoard;
	readonly params: PageParams;
}

export interface BrowserRouter extends Navigation {
	subscribe(changed: () => void): () => void;
	pathname(): string;
}

interface NavigateOptions {
	readonly target?: NavigationTarget;
	readonly params?: PageParams;
}

const PARAM_MARK = ":";
const NEW_TAB = "_blank";

export function matchRoute(routes: readonly ProjectRouteBoard[], pathname: string): RouteMatch | null {
	const asked = segmentsOf(pathname);
	for (const route of [...routes].sort(byStaticSegmentsFirst)) {
		const params = paramsWhenMatching(route, asked);
		if (params) return { route, params };
	}
	return null;
}

export function createBrowserRouter(routes: readonly ProjectRouteBoard[]): BrowserRouter {
	const listeners = new Set<() => void>();
	const arrive = (given: PageParams): void => {
		void writeParamsAt(routes, window.location.pathname, given).then(() => {
			for (const changed of listeners) changed();
		});
	};
	window.addEventListener("popstate", () => arrive({}));
	void writeParamsAt(routes, window.location.pathname, {});
	return {
		canNavigate: true,
		resolve: (link) => (matchRoute(routes, pathnameOf(link)) ? link : null),
		navigate: (link, options) => navigateTo(routes, link, options ?? {}, arrive),
		subscribe: (changed) => {
			listeners.add(changed);
			return () => listeners.delete(changed);
		},
		pathname: () => window.location.pathname,
	};
}

function navigateTo(
	routes: readonly ProjectRouteBoard[],
	link: string,
	{ target, params }: NavigateOptions,
	arrive: (given: PageParams) => void,
): boolean {
	if (!matchRoute(routes, pathnameOf(link))) return false;
	if (target === "blank") return window.open(link, NEW_TAB) !== null;
	window.history.pushState(null, "", link);
	arrive(params ?? {});
	return true;
}

async function writeParamsAt(routes: readonly ProjectRouteBoard[], pathname: string, given: PageParams): Promise<void> {
	const matched = matchRoute(routes, pathname);
	if (!matched) return;
	await withPageParams(pathname, { ...matched.params, ...given }).catch((failure: unknown) =>
		console.error(`[widgetarium] page parameters of ${pathname} → not written`, failure),
	);
}

function paramsWhenMatching(route: ProjectRouteBoard, asked: readonly string[]): PageParams | null {
	const pattern = segmentsOf(route.path);
	if (pattern.length !== asked.length) return null;
	const values: string[] = [];
	for (const [index, segment] of pattern.entries()) {
		const given = asked[index] ?? "";
		if (!isParam(segment) && segment !== given) return null;
		if (isParam(segment)) values.push(given);
	}
	const decoded = values.map(decodedOrNull);
	if (decoded.some((value) => value === null)) return null;
	return Object.fromEntries(route.params.map((name, index) => [name, decoded[index] ?? ""]));
}

function byStaticSegmentsFirst(one: ProjectRouteBoard, other: ProjectRouteBoard): number {
	const [ones, others] = [segmentsOf(one.path), segmentsOf(other.path)];
	const differing = ones.findIndex((segment, index) => isParam(segment) !== isParam(others[index] ?? ""));
	if (differing < 0) return 0;
	return isParam(ones[differing] ?? "") ? 1 : -1;
}

function decodedOrNull(segment: string): string | null {
	try {
		return decodeURIComponent(segment);
	} catch {
		return null;
	}
}

function isParam(segment: string): boolean {
	return segment.startsWith(PARAM_MARK);
}

function pathnameOf(link: string): string {
	return new URL(link, window.location.origin).pathname;
}

function segmentsOf(path: string): string[] {
	return path.split("/").filter((segment) => segment !== "");
}
