import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { browserHostOf } from "./browser-host.js";
import type { BrowserRouter } from "./browser-router.js";
import type { ProjectRouteBoard } from "./widgetarium-project.js";

export interface RouteBoardProps {
	readonly registry: ModuleRegistry;
	readonly router: BrowserRouter;
	readonly route: ProjectRouteBoard;
	readonly pathname: string;
}

export function RouteBoard({ registry, router, route, pathname }: RouteBoardProps): ReactElement {
	const [board, setBoard] = useState(() => normalizeBoard(route.board));
	const host = useMemo(() => browserHostOf(router, pathname), [router, pathname]);
	return h(WidgetSurface, {
		board,
		registry,
		host,
		editing: false,
		isReadOnly: true,
		screen: true,
		onChange: setBoard,
	});
}
