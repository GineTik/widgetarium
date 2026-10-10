import { createElement as h } from "react";
import type { ReactElement } from "react";
import { routeElementOf } from "../app/widgetarium-app.js";
import type { StartedProject } from "../app/widgetarium-app.js";
import { ProjectCanvas } from "./canvas/project-canvas.js";
import type { StudioView } from "@widgetarium/core/engine/studio-state-port.js";

export interface StudioOutletProps {
	readonly project: StartedProject;
	readonly pathname: string;
	readonly view: StudioView;
}

export function StudioOutlet({ project, pathname, view }: StudioOutletProps): ReactElement {
	const shown = view === "canvas" ? h(ProjectCanvas, { project }) : routeElementOf(project, pathname);
	return h("main", { className: "wg-studio-outlet" }, shown);
}
