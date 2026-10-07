import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Drawing, DrawnState, Size } from "./design-canvas-shapes.js";
import { ScreenBoard } from "./design-screen-board.js";
import { StateDrawing } from "./design-state-drawing.js";
import { DrawnWhenSeen } from "./design-drawn-when-seen.js";
import { frameIdOf, snapshotKeyOf } from "./design-snapshots.js";

export interface ScreenFrameProps extends Drawing {
	readonly label: string;
	readonly state: DrawnState;
	readonly size: Size;
}

const SCREEN_HOLDER = { key: "screen", className: "wg-design-screen", inert: true, "data-wg-overlay-root": "" };

export function ScreenFrame({ label, state, size, registry, host }: ScreenFrameProps): ReactElement {
	const frame = {
		className: "wg-design-frame",
		"data-wg-screen": state.picture?.widget,
		style: { width: `${size.width}px` },
	};
	return h("div", frame, [
		h("div", { key: "top", className: "wg-design-top" }, [
			h("span", { key: "name", className: "wg-design-name" }, label),
			state.situation ? h("span", { key: "situation", className: "wg-design-situation" }, state.situation) : null,
		]),
		h(
			"div",
			{ ...SCREEN_HOLDER, style: { minHeight: `${size.height}px` } },
			h(
				DrawnWhenSeen,
				{ minHeight: size.height, ...framePictureOf(state, label, registry) },
				screenOf(state, size, { registry, host }),
			),
		),
	]);
}

function framePictureOf(
	state: DrawnState,
	label: string,
	registry: Drawing["registry"],
): { readonly frame: string; readonly pictureKey: string } {
	const widget = state.picture?.widget ?? state.board?.tiles[0]?.widget ?? label;
	return {
		frame: frameIdOf(widget, label),
		pictureKey: snapshotKeyOf(registry, widget, label, state.picture?.props ?? state.board),
	};
}

function screenOf(state: DrawnState, size: Size, drawing: Drawing): ReactElement {
	if (state.picture) return h(StateDrawing, { picture: state.picture, registry: drawing.registry });
	if (state.board) return h(ScreenBoard, { board: state.board, width: size.width, ...drawing });
	return h("p", { className: "wg-ai-spec-refused" }, state.refusal ?? "");
}
