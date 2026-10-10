import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { cardPxOf } from "./card-width.js";
import { StateDrawing } from "./state-drawing.js";

export interface StateCardProps {
	readonly registry: ModuleRegistry;
	readonly widget: string;
	readonly state: string;
	readonly props: Readonly<Record<string, unknown>>;
}

const LABEL = "{widget} · {state}";

export function StateCard({ widget, state, props, registry }: StateCardProps): ReactElement {
	const label = LABEL.replace("{widget}", widget).replace("{state}", state);
	return h("figure", { className: "wg-studio-canvas-card", "data-state": label }, [
		h("figcaption", { key: "label", className: "wg-studio-canvas-label" }, label),
		h(
			"div",
			{
				key: "drawn",
				className: "wg-studio-canvas-card-body",
				// TRADE-OFF: portals escape inert; a frame is a picture, and inert blocks the press opening one
				inert: true,
				style: { width: `${cardPxOf(registry.get(widget))}px` },
			},
			h(StateDrawing, { picture: { widget, props }, registry }),
		),
	]);
}
