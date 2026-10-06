import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Drawing, DrawnWidget } from "./design-canvas-shapes.js";
import { Group } from "./design-group.js";
import { WidgetCard } from "./design-widget-card.js";

export interface WidgetGroupProps extends Drawing {
	readonly widget: DrawnWidget;
}

const FROM_CATALOGUE = "From catalogue";
const NEW = "New";
const NO_STATES = "No states declared";

export function WidgetGroup({ widget, registry, host }: WidgetGroupProps): ReactElement {
	const definition = registry.get(widget.id);
	const title = definition?.manifest["title"];
	const states = Object.entries(definition?.states ?? {});
	const cards =
		states.length === 0
			? [h(WidgetCard, { key: "default", id: widget.id, label: NO_STATES, registry, host })]
			: states.map(([state, props]) =>
					h(WidgetCard, { key: state, id: widget.id, label: state, props, registry, host }),
				);
	return h(
		Group,
		{
			title: typeof title === "string" ? title : widget.id,
			sub: widget.id,
			badge: widget.isFromCatalogue ? FROM_CATALOGUE : NEW,
		},
		cards,
	);
}
