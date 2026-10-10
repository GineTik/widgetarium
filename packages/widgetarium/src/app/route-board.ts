import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import type { HostOfPathname } from "./widgetarium-app.js";
import type { ProjectRouteBoard } from "./widgetarium-project.js";

export interface RouteBoardProps {
	readonly registry: ModuleRegistry;
	readonly hostOf: HostOfPathname;
	readonly route: ProjectRouteBoard;
	readonly pathname: string;
}

export function RouteBoard({ registry, hostOf, route, pathname }: RouteBoardProps): ReactElement {
	const [board, setBoard] = useState(() => normalizeBoard(route.board));
	const host = useMemo(() => hostOf(pathname), [hostOf, pathname]);
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
