import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { StateCard } from "./state-card.js";

export interface ComponentStatesProps {
	readonly registry: ModuleRegistry;
}

const NO_STATES = "{widget} · declares no states";

export function ComponentStates({ registry }: ComponentStatesProps): ReactElement[] {
	return registry
		.ids()
		.map((widget) =>
			h(
				"section",
				{ key: widget, className: "wg-studio-canvas-widget", "data-widget": widget },
				cardsOf(widget, registry),
			),
		);
}

function cardsOf(widget: string, registry: ModuleRegistry): ReactElement[] {
	const states = Object.entries(registry.get(widget)?.states ?? {});
	if (states.length === 0)
		return [h("p", { key: "none", className: "wg-studio-canvas-label" }, NO_STATES.replace("{widget}", widget))];
	return states.map(([state, props]) => h(StateCard, { key: state, widget, state, props, registry }));
}
