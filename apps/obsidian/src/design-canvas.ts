import { createElement as h, useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement, RefObject } from "react";
import { Button } from "@widgetarium/kit";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import { GAP_PX, MARGIN_PX } from "./design-canvas-shapes.js";
import type { DrawnScreen, Frame, Size } from "./design-canvas-shapes.js";
import { ScreenFrame } from "./design-screen-frame.js";

export interface DesignCanvasProps {
	readonly app: string;
	readonly screens: readonly DrawnScreen[];
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

export function DesignCanvas({ app, screens, size, registry, host }: DesignCanvasProps): ReactElement {
	const screenSize = screenSizeOf(size);
	const frames = framesOf(screens);
	const { layerRef, tallest } = useTallestFrame(screenSize.height, frames.length);
	const field = fieldSizeOf(frames.length, { width: screenSize.width, height: tallest });
	const fit = fitLook(field, size);
	const { look, setLook, refit, fieldRef, moves } = usePanZoom(fit);
	const layer = {
		transform: `translate(${look.x}px, ${look.y}px) scale(${look.scale})`,
		width: `${field.width}px`,
		height: `${field.height}px`,
	};
	const drawn = frames.map((frame, at) =>
		h(ScreenFrame, { key: `${at}-${frame.label}`, frame, at, size: screenSize, registry, host }),
	);
	const said = SCREENS_SAID.replace("{count}", String(screens.length)).replace("{frames}", String(frames.length));
	return h("div", { className: "wg-design-field wg-portal", ref: fieldRef, ...moves }, [
		h("div", { key: "layer", className: "wg-design-layer", style: layer, ref: layerRef }, drawn),
		h("div", { key: "head", className: "wg-design-head" }, [
			h("b", { key: "app" }, app),
			h("span", { key: "count" }, said),
		]),
		zoomBar(look, setLook, refit),
		h("div", { key: "hint", className: "wg-design-hint" }, HINT),
	]);
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
					...[...layer.children].map((frame) => (frame instanceof HTMLElement ? frame.offsetHeight - LABEL_PX : 0)),
				),
			);
		const watcher = new ResizeObserver(measure);
		for (const frame of layer.children) watcher.observe(frame);
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

function fieldSizeOf(count: number, screen: Size): Size {
	return {
		width: MARGIN_PX * 2 + count * screen.width + Math.max(0, count - 1) * GAP_PX,
		height: MARGIN_PX * 2 + LABEL_PX + screen.height,
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
