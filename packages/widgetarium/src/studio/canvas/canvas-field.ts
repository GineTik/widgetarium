import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { PRESSABLE_CONTROLS, usePanZoom } from "./pan-zoom.js";
import type { PanZoomGrips } from "./pan-zoom.js";
import type { Size } from "./frame-size.js";
import { innerSizeOf, useLayerFit, useWatchesSize } from "./layer-fit.js";
import { ZoomBar } from "./zoom-bar.js";

export interface CanvasFieldProps {
	readonly layerClass: string;
	readonly hidden: boolean;
	readonly children?: ReactNode;
}

const ALWAYS_HAND: PanZoomGrips = { isHand: true, pressable: PRESSABLE_CONTROLS, ownScroll: null };

export function CanvasField({ layerClass, hidden, children }: CanvasFieldProps): ReactElement {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const [view, setView] = useState<Size | null>(null);
	const pan = usePanZoom(layerRef, useLayerFit(layerRef, view), ALWAYS_HAND);
	useWatchesSize(pan.fieldRef, setView, innerSizeOf);
	return h("div", { className: "wg-studio-canvas-field", hidden, ref: pan.fieldRef, ...pan.moves }, [
		h("div", { key: "layer", className: `wg-studio-canvas-layer ${layerClass}`, ref: layerRef }, children),
		h(ZoomBar, { key: "zoom", pan }),
	]);
}
