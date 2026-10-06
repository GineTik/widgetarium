import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Drawing } from "./design-canvas-shapes.js";
import { DefaultDrawing } from "./design-default-drawing.js";
import { DrawnWhenSeen } from "./design-drawn-when-seen.js";
import { snapshotKeyOf } from "./design-snapshots.js";
import { StateDrawing } from "./design-state-drawing.js";

export interface WidgetCardProps extends Drawing {
	readonly id: string;
	readonly label: string;
	readonly props?: Readonly<Record<string, unknown>> | undefined;
}

const CARD_PX = { narrow: 400, wide: 800 } as const;
const WIDE_FROM_PX = 560;
const CARD_UNSEEN_PX = 160;

export function WidgetCard({ id, label, props, registry, host }: WidgetCardProps): ReactElement {
	const cardPx = isWide(registry.get(id)?.manifest["preferredSize"]) ? CARD_PX.wide : CARD_PX.narrow;
	return h("figure", { className: "wg-design-widget", style: { width: `${cardPx}px` } }, [
		h("figcaption", { key: "name", className: "wg-design-state-name" }, label),
		h(
			"div",
			{ key: "drawn", className: "wg-design-widget-body", inert: true },
			h(
				DrawnWhenSeen,
				{ minHeight: CARD_UNSEEN_PX, pictureKey: snapshotKeyOf(registry, id, label, props ?? null) },
				props
					? h(StateDrawing, { picture: { widget: id, props }, registry })
					: h(DefaultDrawing, { id, width: cardPx, registry, host }),
			),
		),
	]);
}

function isWide(size: unknown): boolean {
	if (typeof size !== "object" || size === null || !("preferredWidth" in size)) return false;
	const preferred = size.preferredWidth;
	return preferred === "full" || (typeof preferred === "number" && preferred >= WIDE_FROM_PX);
}
