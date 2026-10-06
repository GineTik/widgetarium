import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import type { AppWidgets } from "@widgetarium/core/app-widgets.js";
import { MARGIN_PX } from "./design-canvas-shapes.js";
import type { Drawing } from "./design-canvas-shapes.js";
import { WidgetCard } from "./design-widget-card.js";

export interface WidgetRegionsProps extends Drawing {
	readonly widgets: AppWidgets;
	readonly top: number;
	readonly width: number;
	readonly onHeight: (height: number) => void;
}

const REGION_SAID = "{title} · {count}";
const FROM_CATALOGUE = "From the catalogue";
const MADE_HERE = "New widgets";

export function WidgetRegions({
	widgets,
	top,
	width,
	onHeight,
	registry,
	host,
}: WidgetRegionsProps): ReactElement | null {
	const [held, setHeld] = useState<HTMLDivElement | null>(null);
	useWritesHeight(held, onHeight);
	const regions = [
		{ title: FROM_CATALOGUE, ids: widgets.fromCatalogue },
		{ title: MADE_HERE, ids: widgets.made },
	].filter((region) => region.ids.length > 0);
	if (regions.length === 0) return null;
	const style = { left: `${MARGIN_PX}px`, top: `${top}px`, width: `${width}px` };
	return h(
		"div",
		{ className: "wg-design-regions", style, ref: setHeld },
		regions.map((region) =>
			h("section", { key: region.title, className: "wg-design-region" }, [
				h(
					"div",
					{ key: "top", className: "wg-design-top" },
					h(
						"span",
						{ className: "wg-design-name" },
						REGION_SAID.replace("{title}", region.title).replace("{count}", String(region.ids.length)),
					),
				),
				h(
					"div",
					{ key: "grid", className: "wg-design-bento" },
					region.ids.map((id) => h(WidgetCard, { key: id, id, registry, host })),
				),
			]),
		),
	);
}

function useWritesHeight(watched: HTMLDivElement | null, onHeight: (height: number) => void): void {
	useEffect(() => {
		if (!watched) return onHeight(0);
		const measure = (): void => onHeight(watched.offsetHeight);
		const watcher = new ResizeObserver(measure);
		watcher.observe(watched);
		measure();
		return () => watcher.disconnect();
	}, [watched, onHeight]);
}
