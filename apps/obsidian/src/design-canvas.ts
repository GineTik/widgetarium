import { createElement as h, useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, PointerEvent as ReactPointerEvent, ReactElement, RefObject } from "react";
import { Button } from "@widgetarium/kit";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import { GAP_PX, MARGIN_PX } from "./design-canvas-shapes.js";
import type { DrawnReference, DrawnScreen, Frame, Size } from "./design-canvas-shapes.js";
import { REFERENCE_PX, ReferencesLane } from "./design-references.js";
import { imageFilesIn } from "./design-photos.js";
import { AddPhoto } from "./design-add-photo.js";
import { ScreenFrame } from "./design-screen-frame.js";
import { WidgetRegions } from "./design-widgets.js";
import type { AppWidgets } from "@widgetarium/core/app-widgets.js";

export interface DesignCanvasProps {
	readonly app: string;
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly widgets: AppWidgets;
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

const LABEL_PX = 48;
const ZOOM_STEP = 0.1;
const ZOOM_FLOOR = 0.1;
const ZOOM_CEILING = 2;
const ZOOM_PER_WHEEL = 0.003;
const SCREENS_SAID = "{count} screens · {frames} frames · read only";
const STATE_LABEL = "{screen} · {state}";
const HINT = "Approve or change it in the chat";
const PAGES_SAID = "Pages · {count}";

export function DesignCanvas(props: DesignCanvasProps): ReactElement {
	const { app, screens, references, widgets, size, registry, host, onAddPhotos } = props;
	const laid = useCanvasLayout(screens, references.length, size);
	const pan = usePanZoom(fitLook(laid.field, size));
	const layer = {
		transform: `translate(${pan.look.x}px, ${pan.look.y}px) scale(${pan.look.scale})`,
		width: `${laid.field.width}px`,
		height: `${laid.field.height}px`,
	};
	const drawn = laid.frames.map((frame, at) =>
		h(ScreenFrame, { key: `${at}-${frame.label}`, frame, at, top: laid.screensTop, size: laid.screen, registry, host }),
	);
	const regions = h(WidgetRegions, { key: "regions", widgets, ...laid.regions, registry, host });
	const said = SCREENS_SAID.replace("{count}", String(screens.length)).replace("{frames}", String(laid.frames.length));
	return h(
		"div",
		{ className: "wg-design-field wg-portal", ref: pan.fieldRef, ...pan.moves, ...photoDrops(onAddPhotos) },
		[
			h("div", { key: "layer", className: "wg-design-layer", style: layer, ref: laid.layerRef }, [
				h(ReferencesLane, { key: "references", references, onWidth: laid.setLaneWidth }),
				laid.frames.length > 0 ? pagesHeadOf(laid.pagesTop, screens.length) : null,
				...drawn,
				regions,
			]),
			h("div", { key: "head", className: "wg-design-head" }, [
				h("b", { key: "app" }, app),
				h("span", { key: "count" }, said),
				h(AddPhoto, { key: "add", onAddPhotos }),
			]),
			zoomBar(pan.look, pan.setLook, pan.refit),
			h("div", { key: "hint", className: "wg-design-hint" }, HINT),
		],
	);
}

function useCanvasLayout(screens: readonly DrawnScreen[], referenceCount: number, size: Size) {
	const screen = screenSizeOf(size);
	const frames = framesOf(screens);
	const [laneWidth, setLaneWidth] = useState(0);
	const [regionsHeight, setRegionsHeight] = useState(0);
	const pagesTop = referenceCount === 0 ? MARGIN_PX : MARGIN_PX + LABEL_PX + REFERENCE_PX + GAP_PX;
	const screensTop = pagesTop + LABEL_PX;
	const { layerRef, tallest } = useTallestFrame(screen.height, frames.length);
	const screensBox = fieldSizeOf(frames.length, { width: screen.width, height: tallest }, { screensTop, laneWidth });
	const regionsTop = screensBox.height - MARGIN_PX + GAP_PX;
	const field = {
		width: screensBox.width,
		height: regionsHeight === 0 ? screensBox.height : regionsTop + regionsHeight + MARGIN_PX,
	};
	const regions = { top: regionsTop, width: screensBox.width - MARGIN_PX * 2, onHeight: setRegionsHeight };
	return { screen, frames, pagesTop, screensTop, field, regions, layerRef, setLaneWidth };
}

function pagesHeadOf(top: number, count: number): ReactElement {
	return h(
		"div",
		{
			key: "pages",
			className: "wg-design-top wg-design-region-head",
			style: { left: `${MARGIN_PX}px`, top: `${top}px` },
		},
		h("span", { className: "wg-design-name" }, PAGES_SAID.replace("{count}", String(count))),
	);
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

function framesOf(screens: readonly DrawnScreen[]): Frame[] {
	return screens.flatMap((screen) =>
		screen.states.map((state) => ({
			label:
				screen.states.length < 2
					? screen.name
					: STATE_LABEL.replace("{screen}", screen.name).replace("{state}", state.name),
			state,
		})),
	);
}

function useTallestFrame(floor: number, count: number) {
	const layerRef = useRef<HTMLDivElement | null>(null);
	const [tallest, setTallest] = useState(floor);
	useEffect(() => {
		const layer = layerRef.current;
		if (!layer) return;
		const measure = (): void =>
			setTallest(
				Math.max(
					floor,
					...[...layer.querySelectorAll<HTMLElement>(":scope > .wg-design-frame")].map(
						(frame) => frame.offsetHeight - LABEL_PX,
					),
				),
			);
		const watcher = new ResizeObserver(measure);
		for (const frame of layer.querySelectorAll(":scope > .wg-design-frame")) watcher.observe(frame);
		measure();
		return () => watcher.disconnect();
	}, [floor, count]);
	return { layerRef, tallest };
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

function screenSizeOf(size: Size): Size {
	return { width: Math.max(size.width, 360), height: Math.max(size.height, 480) };
}

function fieldSizeOf(
	count: number,
	screen: Size,
	{ screensTop, laneWidth }: { screensTop: number; laneWidth: number },
): Size {
	const screensWidth = count * screen.width + Math.max(0, count - 1) * GAP_PX;
	return {
		width: MARGIN_PX * 2 + Math.max(screensWidth, laneWidth),
		height: screensTop + MARGIN_PX + (count === 0 ? 0 : LABEL_PX + screen.height),
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
