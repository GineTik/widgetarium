import { createElement as h, useEffect } from "react";
import type { RefObject } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import type { Board } from "@widgetarium/core/model.js";
import type { Drawing } from "./design-canvas-shapes.js";

export interface StaticBoard extends Drawing {
	readonly board: Board;
	readonly width: number;
}

export function useStaticBoardIn(
	node: RefObject<HTMLDivElement | null>,
	{ board, width, registry, host }: StaticBoard,
): void {
	useEffect(() => {
		const held = node.current;
		if (!held) return;
		const props = {
			board,
			boardNode: held,
			registry,
			host,
			editing: false,
			isReadOnly: true,
			initialWidth: width,
			onChange: () => undefined,
		};
		render(h(WidgetSurface, props), held);
		return () => render(null, held);
	}, [board, width, registry, host]);
}
