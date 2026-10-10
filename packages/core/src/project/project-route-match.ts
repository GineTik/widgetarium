import type { PageParams } from "../engine/page-params.js";

export interface RoutePattern {
	readonly path: string;
	readonly params: readonly string[];
}

export interface RouteMatch<Route extends RoutePattern> {
	readonly route: Route;
	readonly params: PageParams;
}

const PARAM_MARK = ":";

export function matchProjectRoute<Route extends RoutePattern>(
	routes: readonly Route[],
	pathname: string,
): RouteMatch<Route> | null {
	const asked = segmentsOf(pathname);
	for (const route of [...routes].sort(byStaticSegmentsFirst)) {
		const params = paramsWhenMatching(route, asked);
		if (params) return { route, params };
	}
	return null;
}

function paramsWhenMatching(route: RoutePattern, asked: readonly string[]): PageParams | null {
	const pattern = segmentsOf(route.path);
	if (pattern.length !== asked.length) return null;
	if (pattern.some((segment, index) => !isParam(segment) && segment !== asked[index])) return null;
	const decoded = asked.filter((_given, index) => isParam(pattern[index] ?? "")).map(decodedOrNull);
	if (decoded.some((value) => value === null)) return null;
	return Object.fromEntries(route.params.map((name, index) => [name, decoded[index] ?? ""]));
}

function byStaticSegmentsFirst(one: RoutePattern, other: RoutePattern): number {
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

function segmentsOf(path: string): string[] {
	return path.split("/").filter((segment) => segment !== "");
}
