import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import type { PanZoom } from "./pan-zoom.js";

export interface ZoomBarProps {
	readonly pan: PanZoom;
}

const ZOOM_STEP = 0.1;

export function ZoomBar({ pan }: ZoomBarProps): ReactElement {
	return h("div", { className: "wg-studio-zoom" }, [
		h(Button, { key: "fit", size: "s", variant: "ghost", onClick: pan.refit }, "Fit"),
		h(Button, { key: "one", size: "s", variant: "ghost", onClick: () => pan.zoomTo(1) }, "1:1"),
		h(Button, { key: "out", size: "s", variant: "ghost", onClick: () => pan.zoomBy(-ZOOM_STEP) }, "−"),
		h(Button, { key: "in", size: "s", variant: "ghost", onClick: () => pan.zoomBy(ZOOM_STEP) }, "+"),
		h("span", { key: "said", className: "wg-studio-percent", ref: pan.percentRef }),
	]);
}
