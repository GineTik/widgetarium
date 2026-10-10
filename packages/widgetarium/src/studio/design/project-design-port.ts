import { NO_DESIGN } from "@widgetarium/core/engine/design-port.js";
import type { DesignPort, DrawnDesign } from "@widgetarium/core/engine/design-port.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { StartedProject } from "../../app/widgetarium-app.js";

const HOME = "/";

export function projectDesignPort(project: StartedProject): DesignPort {
	const drawing = { registry: project.registry, host: project.hostOf(project.routes[0]?.path ?? HOME) };
	return { ...NO_DESIGN, design: async () => projectDesignOf(project), drawing: () => drawing };
}

function projectDesignOf({ routes, registry }: StartedProject): DrawnDesign {
	const withStates = registry.ids().filter((id) => Object.keys(registry.get(id)?.states ?? {}).length > 0);
	return {
		screens: routes.map((route) => ({
			name: route.path,
			states: [{ name: route.path, board: normalizeBoard(route.board) }],
		})),
		references: [],
		widgets: withStates.map((id) => ({ id, isFromCatalogue: false })),
	};
}
