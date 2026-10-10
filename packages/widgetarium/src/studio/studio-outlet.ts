import { createElement as h } from "react";
import type { ReactElement } from "react";
import { routeElementOf } from "../app/widgetarium-app.js";
import type { StartedProject } from "../app/widgetarium-app.js";
import { CanvasPlaceholder } from "./canvas-placeholder.js";
import type { StudioView } from "./studio-state.js";

export interface StudioOutletProps {
	readonly project: StartedProject;
	readonly pathname: string;
	readonly view: StudioView;
}

export function StudioOutlet({ project, pathname, view }: StudioOutletProps): ReactElement {
	const shown = view === "canvas" ? h(CanvasPlaceholder) : routeElementOf(project, pathname);
	return h("main", { className: "wg-studio-outlet" }, shown);
}
