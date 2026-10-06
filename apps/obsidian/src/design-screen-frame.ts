import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Drawing, DrawnState, Size } from "./design-canvas-shapes.js";
import { ScreenBoard } from "./design-screen-board.js";
import { StateDrawing } from "./design-state-drawing.js";

export interface ScreenFrameProps extends Drawing {
	readonly label: string;
	readonly state: DrawnState;
	readonly size: Size;
}

export function ScreenFrame({ label, state, size, registry, host }: ScreenFrameProps): ReactElement {
	return h("div", { className: "wg-design-frame", style: { width: `${size.width}px` } }, [
		h("div", { key: "top", className: "wg-design-top" }, h("span", { className: "wg-design-name" }, label)),
		h(
			"div",
			{
				key: "screen",
				className: "wg-design-screen",
				inert: true,
				"data-wg-overlay-layer": "",
				style: { minHeight: `${size.height}px` },
			},
			screenOf(state, size, { registry, host }),
		),
	]);
}

function screenOf(state: DrawnState, size: Size, drawing: Drawing): ReactElement {
	if (state.picture) return h(StateDrawing, { picture: state.picture, registry: drawing.registry });
	if (state.board) return h(ScreenBoard, { board: state.board, width: size.width, ...drawing });
	return h("p", { className: "wg-ai-spec-refused" }, state.refusal ?? "");
}
