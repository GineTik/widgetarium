import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GAP_PX, MARGIN_PX } from "./design-canvas-shapes.js";
import type { Drawing, Frame, Size } from "./design-canvas-shapes.js";
import { ScreenBoard } from "./design-screen-board.js";

export interface ScreenFrameProps extends Drawing {
	readonly frame: Frame;
	readonly at: number;
	readonly size: Size;
}

export function ScreenFrame({ frame, at, size, registry, host }: ScreenFrameProps): ReactElement {
	const style = {
		left: `${MARGIN_PX + at * (size.width + GAP_PX)}px`,
		top: `${MARGIN_PX}px`,
		width: `${size.width}px`,
	};
	return h("div", { className: "wg-design-frame", style }, [
		h("div", { key: "top", className: "wg-design-top" }, h("span", { className: "wg-design-name" }, frame.label)),
		h("div", { key: "screen", className: "wg-design-screen", inert: true, style: { minHeight: `${size.height}px` } }, [
			frame.state.board
				? h(ScreenBoard, { key: "board", board: frame.state.board, width: size.width, registry, host })
				: h("p", { key: "refused", className: "wg-ai-spec-refused" }, frame.state.refusal ?? ""),
		]),
	]);
}
