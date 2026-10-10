import { createElement as h, useMemo, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { routeElementOf } from "../../app/widgetarium-app.js";
import type { StartedProject } from "../../app/widgetarium-app.js";
import { RouteBoard } from "../../app/route-board.js";
import type { ProjectRouteBoard } from "../../app/widgetarium-project.js";
import { frameProjectOf } from "./frame-project.js";
import { DESKTOP_FRAME } from "./frame-size.js";

export interface RouteFrameProps {
	readonly project: StartedProject;
	readonly route: ProjectRouteBoard;
}

const NEEDS = "needs {params}";

export function RouteFrame({ project, route }: RouteFrameProps): ReactElement {
	const frame = useMemo(() => frameProjectOf(project, route), [project, route]);
	const pathname = useSyncExternalStore(frame.router.subscribe, frame.router.pathname);
	const needed = route.params;
	return h("figure", { className: "wg-studio-frame", "data-route": route.path }, [
		h("figcaption", { key: "label", className: "wg-studio-canvas-label" }, [
			h("span", { key: "path" }, route.path),
			needed.length === 0 ? null : h("span", { key: "needs", className: "wg-studio-needs" }, needsSaid(needed)),
		]),
		h(
			"div",
			{
				key: "drawn",
				className: "wg-studio-frame-body",
				// TRADE-OFF: portals escape inert; a frame is a picture, and inert blocks the press opening one
				inert: true,
				style: { width: `${DESKTOP_FRAME.width}px`, minHeight: `${DESKTOP_FRAME.height}px` },
			},
			needed.length === 0
				? routeElementOf(frame, pathname)
				: h(RouteBoard, { registry: frame.registry, hostOf: frame.hostOf, route, pathname: route.path }),
		),
	]);
}

function needsSaid(params: readonly string[]): string {
	return NEEDS.replace("{params}", params.map((name) => `:${name}`).join(", "));
}
