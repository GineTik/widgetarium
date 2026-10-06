import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";
import type { Drawing } from "./design-canvas-shapes.js";
import { ScreenBoard } from "./design-screen-board.js";

export interface WidgetCardProps extends Drawing {
	readonly id: string;
}

const CARD_PX = { narrow: 480, wide: 960 } as const;
const WIDE_FROM_PX = 560;

export function WidgetCard({ id, registry, host }: WidgetCardProps): ReactElement {
	const manifest = registry.get(id)?.manifest;
	const cardPx = isWide(manifest?.["preferredSize"]) ? CARD_PX.wide : CARD_PX.narrow;
	const title = manifest?.["title"];
	const board = useMemo(() => boardOfOne(id), [id]);
	return h("figure", { className: "wg-design-widget", style: { width: `${cardPx}px` } }, [
		h("figcaption", { key: "name", className: "wg-design-widget-name" }, [
			h("b", { key: "title" }, typeof title === "string" ? title : id),
			h("span", { key: "id" }, id),
		]),
		h(
			"div",
			{ key: "drawn", className: "wg-design-widget-body", inert: true },
			h(ScreenBoard, { board, width: cardPx, registry, host }),
		),
	]);
}

function isWide(size: unknown): boolean {
	if (typeof size !== "object" || size === null || !("preferredWidth" in size)) return false;
	const preferred = size.preferredWidth;
	return preferred === "full" || (typeof preferred === "number" && preferred >= WIDE_FROM_PX);
}

function boardOfOne(id: string): Board {
	return normalizeBoard({
		v: 2,
		tiles: [{ id: "widget", widget: id }],
		layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: "widget" }] }] },
	});
}
