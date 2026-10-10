import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Drawing, DrawnReference } from "./design-canvas-shapes.js";
import { Group } from "./design-group.js";
import { NotedPicture } from "./design-noted-picture.js";
import type { WidgetOpener } from "./design-noted-picture.js";
import { Region } from "./design-region.js";

export interface ReferencesRegionProps {
	readonly references: readonly DrawnReference[];
	readonly opener: WidgetOpener;
}

const REFERENCES = "References";

export function ReferencesRegion({ references, opener }: ReferencesRegionProps): ReactElement | null {
	if (references.length === 0) return null;
	return h(
		Region,
		{ title: REFERENCES, count: references.length },
		references.map((reference) =>
			h(
				Group,
				{ key: reference.name, title: titleOf(reference), badge: reference.kind, sub: reference.why },
				h(NotedPicture, { reference, opener }),
			),
		),
	);
}

export function widgetOpenerOf(registry: Drawing["registry"], open: (widget: string) => void): WidgetOpener {
	return {
		open,
		nameOf: (widget) => {
			const title = registry.get(widget)?.manifest["title"];
			return typeof title === "string" ? title : widget;
		},
	};
}

function titleOf(reference: DrawnReference): string {
	const name = reference.name.split("/").pop() ?? reference.name;
	return decodeURIComponent(name.split("?")[0] ?? name);
}
