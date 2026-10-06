import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, ReactElement } from "react";
import { Button, Icon, IconButton } from "@widgetarium/kit";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import type { DrawnReference, DrawnScreen, DrawnWidget, Size } from "./design-canvas-shapes.js";
import { imageFilesIn } from "./design-photos.js";
import { WIDGETS_PAGE, canvasPagesOf, regionsOfPage, shownPageOf } from "./design-canvas-page.js";
import { LayersPanel } from "./design-layers-panel.js";
import type { LayerMove } from "./layer-moves.js";
import { fitLook, usePanZoom } from "./design-pan-zoom.js";
import type { PanZoom } from "./design-pan-zoom.js";
import { PicturesProgress } from "./design-pictures-progress.js";
import { TopBar } from "./design-top-bar.js";

export interface DesignCanvasProps {
	readonly app: string;
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly widgets: readonly DrawnWidget[];
	readonly onAddPhotos: (photos: readonly File[]) => void;
	readonly page: string;
	readonly onPage: (page: string) => void;
	readonly isLayersOpen: boolean;
	readonly onLayers: () => void;
	readonly onMove: (widget: string, move: LayerMove) => void;
	readonly size: Size;
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}

const ZOOM_STEP = 0.1;
const SCREENS_SAID = "{count} screens · {frames} frames · read only";
const HINT = "Approve or change it in the chat";
const LAYERS_SAID = "Layers";

export function DesignCanvas(props: DesignCanvasProps): ReactElement {
	const { layerRef, field } = useLayerSize(props.size);
	const fit = useMemo(() => fitLook(field, props.size), [field, props.size]);
	const pan = usePanZoom(layerRef, fit);
	const { screens, references, widgets, registry, host } = props;
	const page = shownPageOf(props.page, screens);
	const regions = useMemo(
		() => regionsOfPage({ page, screens, references, widgets, registry, host }),
		[page, screens, references, widgets, registry, host],
	);
	return h(
		"div",
		{ className: "wg-design-field wg-portal", ref: pan.fieldRef, ...pan.moves, ...photoDrops(props.onAddPhotos) },
		[
			h("div", { key: "layer", className: "wg-design-layer", ref: layerRef }, regions),
			topBarOf(props, page),
			layersOf(props, page),
			zoomBar(pan),
			h("div", { key: "hint", className: "wg-design-hint" }, HINT),
		],
	);
}

function topBarOf(
	{ app, screens, onPage, onAddPhotos, isLayersOpen, onLayers }: DesignCanvasProps,
	page: string,
): ReactElement {
	const frames = screens.reduce((count, screen) => count + screen.states.length, 0);
	const said = SCREENS_SAID.replace("{count}", String(screens.length)).replace("{frames}", String(frames));
	const status = h(PicturesProgress, { key: "pictures" });
	const layers =
		page === WIDGETS_PAGE
			? null
			: h(
					IconButton,
					{
						key: "layers",
						size: "s",
						variant: isLayersOpen ? "raised" : "ghost",
						label: LAYERS_SAID,
						onClick: onLayers,
					},
					h(Icon, { name: "panel-left", size: 16 }),
				);
	return h(TopBar, { key: "top", app, said, pages: canvasPagesOf(screens), page, onPage, onAddPhotos, status, layers });
}

function layersOf({ screens, registry, isLayersOpen, onMove }: DesignCanvasProps, page: string): ReactElement | null {
	const screen = screens.find((one) => one.name === page);
	if (!isLayersOpen || !screen) return null;
	return h(LayersPanel, { key: "layers-panel", screen, registry, onMove });
}

function useLayerSize(view: Size) {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const [field, setField] = useState<Size>(view);
	useEffect(() => {
		const layer = layerRef.current;
		if (!layer) return;
		const measure = (): void => setField({ width: layer.offsetWidth, height: layer.offsetHeight });
		const watcher = new ResizeObserver(measure);
		watcher.observe(layer);
		measure();
		return () => watcher.disconnect();
	}, []);
	return { layerRef, field };
}

function photoDrops(onAddPhotos: (photos: readonly File[]) => void) {
	return {
		onDragOver: (event: DragEvent): void => event.preventDefault(),
		onDrop: (event: DragEvent): void => {
			const photos = imageFilesIn(event.dataTransfer?.files);
			if (photos.length === 0) return;
			event.preventDefault();
			onAddPhotos(photos);
		},
	};
}

function zoomBar(pan: PanZoom): ReactElement {
	return h("div", { key: "zoom", className: "wg-design-zoom" }, [
		h(Button, { key: "fit", size: "s", variant: "ghost", onClick: pan.refit }, "Fit"),
		h(Button, { key: "one", size: "s", variant: "ghost", onClick: () => pan.zoomTo(1) }, "1:1"),
		h(Button, { key: "out", size: "s", variant: "ghost", onClick: () => pan.zoomBy(-ZOOM_STEP) }, "−"),
		h(Button, { key: "in", size: "s", variant: "ghost", onClick: () => pan.zoomBy(ZOOM_STEP) }, "+"),
		h("span", { key: "said", className: "wg-design-percent", ref: pan.percentRef }),
	]);
}
