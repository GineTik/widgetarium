import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { SegmentedItem } from "@widgetarium/kit";
import type { StartedProject } from "../../app/widgetarium-app.js";
import { CanvasField } from "./canvas-field.js";
import { ComponentStates } from "./component-states.js";
import { RouteFrame } from "./route-frame.js";

export interface ProjectCanvasProps {
	readonly project: StartedProject;
}

type CanvasPage = "pages" | "components";

const PAGES: readonly SegmentedItem<CanvasPage>[] = [
	{ value: "pages", label: "Pages" },
	{ value: "components", label: "Components" },
];

export function ProjectCanvas({ project }: ProjectCanvasProps): ReactElement {
	const [page, setPage] = useState<CanvasPage>("pages");
	return h("section", { className: "wg-studio-canvas wg-portal" }, [
		h(
			"div",
			{ key: "switch", className: "wg-studio-canvas-switch" },
			h(Segmented<CanvasPage>, { items: PAGES, value: page, onValueChange: setPage }),
		),
		h(
			CanvasField,
			{ key: "pages", layerClass: "is-pages", hidden: page !== "pages" },
			project.routes.map((route) => h(RouteFrame, { key: route.path, project, route })),
		),
		h(
			CanvasField,
			{ key: "components", layerClass: "is-components", hidden: page !== "components" },
			h(ComponentStates, { registry: project.registry }),
		),
	]);
}
