import { createElement as h, useEffect, useMemo, useRef } from "react";
import type { DragEvent, ReactElement, RefObject } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { PRESSABLE_CONTROLS, usePanZoom } from "../canvas/pan-zoom.js";
import type { PanZoom } from "../canvas/pan-zoom.js";
import { ZoomBar } from "../canvas/zoom-bar.js";
import { useLayerFit } from "../canvas/layer-fit.js";
import type { Box } from "../canvas/flight.js";
import type { Size } from "../canvas/frame-size.js";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import type { DrawnReference, DrawnScreen, DrawnWidget } from "./design-canvas-shapes.js";
import { imageFilesIn } from "./design-photos.js";
import { COMPONENTS_PAGE, canvasTabsOf, regionsOfPage, shownPageOf } from "./design-canvas-page.js";
import { pageLabelOf } from "./design-job.js";
import type { Job } from "@widgetarium/core/app-jobs.js";
import type { CanvasDoc } from "./design-docs.js";
import type { JobControls } from "./design-job.js";
import type { WidgetOpener } from "./design-noted-picture.js";
import { shownVariantOf } from "./design-variants.js";
import type { VariantPick } from "./design-variants.js";
import { LayersPanel } from "./design-layers-panel.js";
import type { LayerFocus } from "./design-layers-panel.js";
import { Highlight, lookOnto } from "./design-spotlight.js";
import { useCanvasSelection } from "./design-canvas-selection.js";
import { CanvasTools } from "./design-tools.js";
import type { CanvasMode } from "./design-tools.js";
import type { LayerMove } from "./layer-moves.js";
import { PicturesProgress } from "./design-pictures-progress.js";
import { AgentLookChip } from "./design-agent-look.js";
import { TopBar } from "./design-top-bar.js";
import type { CanvasTab, TopBarCorners } from "./design-top-bar.js";

export interface DesignCanvasProps {
	readonly app: string;
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly widgets: readonly DrawnWidget[];
	readonly jobs: readonly Job[];
	readonly docs: readonly CanvasDoc[];
	readonly controls: JobControls;
	readonly opener: WidgetOpener;
	readonly pick: VariantPick;
	readonly focusWidget: string | null;
	readonly onFocusedWidget: () => void;
	readonly onAddPhotos: (photos: readonly File[]) => void;
	readonly page: string;
	readonly keptPage: string;
	readonly onPage: (page: string) => void;
	readonly isLayersOpen: boolean;
	readonly onLayers: () => void;
	readonly onMove: (widget: string, move: LayerMove) => void;
	readonly mode: CanvasMode;
	readonly onMode: (mode: CanvasMode) => void;
	readonly onReturn: () => void;
	readonly size: Size;
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}

const SCREENS_SAID = "{count} screens · {frames} frames · read only";
const HINT = "Answer a job on its page, or tell the agent in the chat";
const LAYERS_SAID = "Layers";
const PAGE_FADE_MS = 140;
const FADED_ON_TURN = ".wg-design-layer, .wg-design-layers.is-open";
const LAYERS_PANEL = ".wg-design-layers";
const PRESSABLE_IN_DESIGN = `${PRESSABLE_CONTROLS}, ${LAYERS_PANEL}, .wg-design-job`;

export function DesignCanvas(props: DesignCanvasProps): ReactElement {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const pan = usePanZoom(layerRef, useLayerFit(layerRef, props.size), {
		isHand: props.mode === "hand",
		pressable: PRESSABLE_IN_DESIGN,
		ownScroll: LAYERS_PANEL,
	});
	const selection = useCanvasSelection(layerRef, pan);
	const { screens, references, widgets, jobs, docs, controls, opener, pick, registry, host } = props;
	const page = shownPageOf(props.page, { screens, references, jobs, docs, keptPage: props.keptPage });
	useEscapeClears(selection.picked !== null, selection.clear);
	useFliesToWidget({ layerRef, pan, page, widget: props.focusWidget, onDone: props.onFocusedWidget });
	const regions = useMemo(
		() => regionsOfPage({ page, screens, references, widgets, jobs, docs, controls, opener, pick, registry, host }),
		[page, screens, references, widgets, jobs, docs, controls, opener, pick, registry, host],
	);
	const isPointer = props.mode === "pointer";
	return h(
		"div",
		{
			className: `wg-design-field wg-portal ${isPointer ? "is-pointer" : "is-hand"}`,
			ref: pan.fieldRef,
			...pan.moves,
			...(isPointer ? selection.pointing : {}),
			...photoDrops(props.onAddPhotos),
		},
		[
			h(
				"div",
				{ key: "layer", className: "wg-design-layer", ref: layerRef },
				regions,
				h(Highlight, { key: "hovered", spot: isPointer ? selection.hovered : null, tone: "hover" }),
				h(Highlight, { key: "picked", spot: selection.picked, tone: "picked" }),
			),
			layersOf(
				{ ...props, picked: selection.picked?.mark ?? null, onFocus: selection.onFocus, keepsLiveCopy: isPointer },
				page,
			),
			h(ZoomBar, { key: "zoom", pan }),
			h("div", { key: "hint", className: "wg-design-hint" }, HINT),
		],
	);
}

export interface CanvasTopBarProps extends DesignCanvasProps {
	readonly fieldOf: () => HTMLElement | null;
	readonly corners?: TopBarCorners | undefined;
}

export function CanvasTopBar(props: CanvasTopBarProps): ReactElement {
	const page = shownPageOf(props.page, props);
	const onPage = (next: string): void => fadedTurn(props.fieldOf(), () => props.onPage(next));
	return topBarOf({ ...props, onPage }, page);
}

function topBarOf(
	{
		app,
		screens,
		references,
		jobs,
		docs,
		keptPage,
		onPage,
		onAddPhotos,
		mode,
		onMode,
		onReturn,
		isLayersOpen,
		onLayers,
		corners,
	}: CanvasTopBarProps,
	page: string,
): ReactElement {
	const frames = screens.reduce((count, screen) => count + screen.states.length, 0);
	const said = SCREENS_SAID.replace("{count}", String(screens.length)).replace("{frames}", String(frames));
	const status = [h(PicturesProgress, { key: "pictures" }), h(AgentLookChip, { key: "agent", app, onPage })];
	const tabs = canvasTabsOf({ screens, references, jobs, docs, keptPage });
	const layers =
		page === COMPONENTS_PAGE
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
	return h(TopBar, {
		key: "top",
		app,
		said,
		leading: tabs.leading.map(tabOf),
		pages: tabs.screens.map((one) => ({ value: one, label: pageLabelOf(one, jobs) })),
		trailing: tabs.trailing.map(tabOf),
		page,
		onPage,
		canvasTools: h(CanvasTools, { key: "canvas-tools", mode, onMode, onAddPhotos }),
		onReturn,
		status,
		layers,
		corners,
	});
}

function tabOf(page: string): CanvasTab {
	return { value: page, label: page };
}

interface Picking {
	readonly picked: string | null;
	readonly onFocus: (focus: LayerFocus | null) => void;
	readonly keepsLiveCopy: boolean;
}

function layersOf(
	{ screens, pick, registry, isLayersOpen, onMove, picked, onFocus, keepsLiveCopy }: DesignCanvasProps & Picking,
	page: string,
): ReactElement | null {
	const [screen] = shownVariantOf(screens, page, pick);
	if (!screen) return null;
	return h(LayersPanel, {
		key: "layers-panel",
		screen,
		isOpen: isLayersOpen,
		keepsLiveCopy,
		registry,
		picked,
		onMove,
		onFocus,
	});
}

function useEscapeClears(isSet: boolean, clear: () => void): void {
	useEffect(() => {
		if (!isSet) return;
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === "Escape") clear();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isSet, clear]);
}

function fadedTurn(field: HTMLElement | null, turn: () => void): void {
	const shown = field ? [...field.querySelectorAll<HTMLElement>(FADED_ON_TURN)] : [];
	if (shown.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return turn();
	const outs = shown.map((element) =>
		element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: PAGE_FADE_MS, easing: "ease-out", fill: "forwards" }),
	);
	void Promise.all(outs.map((out) => out.finished)).then(turn);
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

interface WidgetFlight {
	readonly layerRef: RefObject<HTMLDivElement | null>;
	readonly pan: PanZoom;
	readonly page: string;
	readonly widget: string | null;
	readonly onDone: () => void;
}

function useFliesToWidget({ layerRef, pan, page, widget, onDone }: WidgetFlight): void {
	useEffect(() => {
		if (widget === null || page !== COMPONENTS_PAGE) return undefined;
		const frame = requestAnimationFrame(() => {
			const layer = layerRef.current;
			const group = layer
				? [...layer.querySelectorAll<HTMLElement>("[data-wg-group]")].find((one) => one.dataset["wgGroup"] === widget)
				: null;
			if (layer && group) pan.flyTo(lookOnto(boxInLayer(layer, group), pan.fieldRef.current));
			onDone();
		});
		return () => cancelAnimationFrame(frame);
	}, [layerRef, pan, page, widget, onDone]);
}

function boxInLayer(layer: HTMLElement, element: HTMLElement): Box {
	const origin = layer.getBoundingClientRect();
	const drawn = element.getBoundingClientRect();
	const scale = drawn.width / Math.max(1, element.offsetWidth);
	return {
		x: (drawn.left - origin.left) / scale,
		y: (drawn.top - origin.top) / scale,
		width: element.offsetWidth,
		height: element.offsetHeight,
	};
}
