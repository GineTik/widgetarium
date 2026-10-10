import { createElement as h } from "react";
import type { ReactElement } from "react";

const CANVAS_TITLE = "Canvas";
const CANVAS_LATER = "The design canvas arrives in the studio's next stages. Back to view shows the app.";

// TODO: replace with the design canvas in stage 3
export function CanvasPlaceholder(): ReactElement {
	return h(
		"section",
		{ className: "wg-studio-canvas-placeholder" },
		h("h1", null, CANVAS_TITLE),
		h("p", null, CANVAS_LATER),
	);
}
