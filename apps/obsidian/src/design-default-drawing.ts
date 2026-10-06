import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";
import type { Drawing } from "./design-canvas-shapes.js";
import { ScreenBoard } from "./design-screen-board.js";

export interface DefaultDrawingProps extends Drawing {
	readonly id: string;
	readonly width: number;
}

export function DefaultDrawing({ id, width, registry, host }: DefaultDrawingProps): ReactElement {
	const board = useMemo(() => boardOfOne(id), [id]);
	return h(ScreenBoard, { board, width, registry, host });
}

function boardOfOne(id: string): Board {
	return normalizeBoard({
		v: 2,
		tiles: [{ id: "widget", widget: id }],
		layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: "widget" }] }] },
	});
}
