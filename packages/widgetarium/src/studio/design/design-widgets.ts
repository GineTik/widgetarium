import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Drawing, DrawnWidget } from "./design-canvas-shapes.js";
import { Region } from "./design-region.js";
import { WidgetGroup } from "./design-widget-group.js";

export interface WidgetsRegionProps extends Drawing {
	readonly widgets: readonly DrawnWidget[];
}

const WIDGETS = "Widgets";

export function WidgetsRegion({ widgets, registry, host }: WidgetsRegionProps): ReactElement | null {
	if (widgets.length === 0) return null;
	return h(
		Region,
		{ title: WIDGETS, count: widgets.length },
		widgets.map((widget) => h(WidgetGroup, { key: widget.id, widget, registry, host })),
	);
}
