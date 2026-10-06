import { createElement as h, useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, PointerEvent as ReactPointerEvent, ReactElement, RefObject } from "react";
import { Button } from "@widgetarium/kit";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import type { DrawnReference, DrawnScreen, DrawnWidget, Size } from "./design-canvas-shapes.js";
import { ReferencesRegion } from "./design-references.js";
import { imageFilesIn } from "./design-photos.js";
import { AddPhoto } from "./design-add-photo.js";
import { PagesRegion } from "./design-pages.js";
import { WidgetsRegion } from "./design-widgets.js";

export interface DesignCanvasProps {
	readonly app: string;
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly widgets: readonly DrawnWidget[];
	readonly onAddPhotos: (photos: readonly File[]) => void;
	readonly size: Size;
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}

interface Look {
	readonly x: number;
	readonly y: number;
	readonly scale: number;
}

const ZOOM_STEP = 0.1;
const ZOOM_FLOOR = 0.1;
const ZOOM_CEILING = 2;
const ZOOM_PER_WHEEL = 0.003;
const SCREENS_SAID = "{count} screens · {frames} frames · read only";
const HINT = "Approve or change it in the chat";
const DESKTOP_FRAME: Size = { width: 1280, height: 832 };

export function DesignCanvas(props: DesignCanvasProps): ReactElement {
	const { layerRef, field } = useLayerSize(props.size);
	const pan = usePanZoom(fitLook(field, props.size));
	const layer = { transform: `translate(${pan.look.x}px, ${pan.look.y}px) scale(${pan.look.scale})` };
	return h(
		"div",
		{ className: "wg-design-field wg-portal", ref: pan.fieldRef, ...pan.moves, ...photoDrops(props.onAddPhotos) },
		[
			h("div", { key: "layer", className: "wg-design-layer", style: layer, ref: layerRef }, regionsOf(props)),
			canvasHeadOf(props),
			zoomBar(pan.look, pan.setLook, pan.refit),
			h("div", { key: "hint", className: "wg-design-hint" }, HINT),
		],
	);
}

function regionsOf({ screens, references, widgets, registry, host }: DesignCanvasProps): ReactElement[] {
	return [
		h(ReferencesRegion, { key: "references", references }),
		h(PagesRegion, { key: "pages", screens, size: DESKTOP_FRAME, registry, host }),
		h(WidgetsRegion, { key: "widgets", widgets, registry, host }),
	];
}

function canvasHeadOf({ app, screens, onAddPhotos }: DesignCanvasProps): ReactElement {
	const frames = screens.reduce((count, screen) => count + screen.states.length, 0);
	const said = SCREENS_SAID.replace("{count}", String(screens.length)).replace("{frames}", String(frames));
	return h("div", { key: "head", className: "wg-design-head" }, [
		h("b", { key: "app" }, app),
		h("span", { key: "count" }, said),
		h(AddPhoto, { key: "add", onAddPhotos }),
	]);
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

function usePanZoom(fit: Look) {
	const [held, setHeld] = useState<Look | null>(null);
	const look = held ?? fit;
	const fitRef = useRef(fit);
	fitRef.current = fit;
	const setLook = useCallback(
		(next: Look | ((was: Look) => Look)): void =>
			setHeld((was) => (typeof next === "function" ? next(was ?? fitRef.current) : next)),
		[],
	);
	const refit = useCallback((): void => setHeld(null), []);
	const drag = useRef<{ x: number; y: number } | null>(null);
	const fieldRef = useRef<HTMLDivElement | null>(null);
	useNativeWheel(fieldRef, setLook);
	return { look, setLook, refit, fieldRef, moves: dragMoves(look, setLook, drag) };
}

function useNativeWheel(
	fieldRef: RefObject<HTMLDivElement | null>,
	setLook: (next: (held: Look) => Look) => void,
): void {
	useEffect(() => {
		const field = fieldRef.current;
		if (!field) return;
		const onWheel = (event: WheelEvent): void => {
			event.preventDefault();
			event.stopPropagation();
			const box = field.getBoundingClientRect();
			setLook((held) => wheeled(held, event, { x: event.clientX - box.left, y: event.clientY - box.top }));
		};
		field.addEventListener("wheel", onWheel, { passive: false });
		return () => field.removeEventListener("wheel", onWheel);
	}, [fieldRef, setLook]);
}

function dragMoves(look: Look, setLook: (next: Look) => void, drag: { current: { x: number; y: number } | null }) {
	return {
		onPointerDown: (event: ReactPointerEvent<HTMLElement>): void => {
			if (event.target instanceof Element && event.target.closest("button, [role=radio], [role=tab]")) return;
			drag.current = { x: event.clientX - look.x, y: event.clientY - look.y };
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		onPointerMove: (event: ReactPointerEvent<HTMLElement>): void => {
			if (drag.current) setLook({ ...look, x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
		},
		onPointerUp: (): void => void (drag.current = null),
		onPointerCancel: (): void => void (drag.current = null),
	};
}

function fitLook(field: Size, view: Size): Look {
	const scale = Math.max(ZOOM_FLOOR, Math.min(1, view.width / field.width, view.height / field.height));
	return { scale, x: (view.width - field.width * scale) / 2, y: (view.height - field.height * scale) / 2 };
}

function wheeled(look: Look, event: WheelEvent, at: { x: number; y: number }): Look {
	if (!event.ctrlKey && !event.metaKey) return { ...look, x: look.x - event.deltaX, y: look.y - event.deltaY };
	const scale = clamp(look.scale * (1 - event.deltaY * ZOOM_PER_WHEEL), ZOOM_FLOOR, ZOOM_CEILING);
	return { scale, x: at.x - ((at.x - look.x) * scale) / look.scale, y: at.y - ((at.y - look.y) * scale) / look.scale };
}

function clamp(value: number, low: number, high: number): number {
	return Math.max(low, Math.min(value, high));
}

function zoomBar(look: Look, setLook: (next: Look) => void, refit: () => void): ReactElement {
	const by = (step: number) => () => setLook({ ...look, scale: clamp(look.scale + step, ZOOM_FLOOR, ZOOM_CEILING) });
	return h("div", { key: "zoom", className: "wg-design-zoom" }, [
		h(Button, { key: "fit", size: "s", variant: "ghost", onClick: refit }, "Fit"),
		h(Button, { key: "one", size: "s", variant: "ghost", onClick: () => setLook({ ...look, scale: 1 }) }, "1:1"),
		h(Button, { key: "out", size: "s", variant: "ghost", onClick: by(-ZOOM_STEP) }, "−"),
		h(Button, { key: "in", size: "s", variant: "ghost", onClick: by(ZOOM_STEP) }, "+"),
		h("span", { key: "said", className: "wg-design-percent" }, `${Math.round(look.scale * 100)}%`),
	]);
}
