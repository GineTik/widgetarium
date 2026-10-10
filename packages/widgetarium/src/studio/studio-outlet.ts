import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { StudioState, StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import { routeElementOf } from "../app/widgetarium-app.js";
import type { StartedProject } from "../app/widgetarium-app.js";
import { StudioCanvas } from "./studio-canvas.js";
import type { StudioDesign } from "./studio-canvas.js";

export interface StudioOutletProps {
	readonly project: StartedProject;
	readonly pathname: string;
	readonly view: StudioView;
	readonly design: StudioDesign;
	readonly state: StudioState;
}

export function StudioOutlet({ project, pathname, view, design, state }: StudioOutletProps): ReactElement {
	const shown = view === "canvas" ? h(StudioCanvas, { design, state }) : routeElementOf(project, pathname);
	return h("main", { className: "wg-studio-outlet" }, shown);
}
