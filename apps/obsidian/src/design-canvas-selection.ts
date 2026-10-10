import { useState } from "react";
import type { MouseEvent, RefObject } from "react";
import type { LayerFocus } from "./design-layers-panel.js";
import { seenLayersOf } from "./design-layers-panel.js";
import type { PanZoom } from "widgetarium/studio";
import { LIVE_SCREEN, hitsAt, parentsOf, pickedHit } from "./design-selection.js";
import type { PickDepth } from "./design-selection.js";
import { firstScreenOf, isSameSpot, lookOnto, screenBoxOf, spotOn } from "./design-spotlight.js";
import type { Spot } from "./design-spotlight.js";

export interface CanvasSelection {
	readonly picked: Spot | null;
	readonly hovered: Spot | null;
	readonly onFocus: (focus: LayerFocus | null) => void;
	readonly clear: () => void;
	readonly pointing: {
		readonly onMouseMove: (event: MouseEvent) => void;
		readonly onMouseLeave: () => void;
		readonly onClick: (event: MouseEvent) => void;
		readonly onDoubleClick: (event: MouseEvent) => void;
	};
}

interface ScreenUnder {
	readonly element: HTMLElement;
	readonly widget: string;
}

const CHROME = ".wg-design-layers, .wg-design-topbar, .wg-studio-zoom, .wg-design-hint";
const SCREENS = ".wg-design-frame[data-wg-screen]";

export function useCanvasSelection(layerRef: RefObject<HTMLDivElement | null>, pan: PanZoom): CanvasSelection {
	const [picked, setPicked] = useState<Spot | null>(null);
	const [hovered, setHovered] = useState<Spot | null>(null);
	const spotAt = (event: MouseEvent, depth: PickDepth): Spot | null => {
		const layer = layerRef.current;
		if (!layer || (event.target instanceof Element && event.target.closest(CHROME))) return null;
		const under = screenUnder(layer, event);
		const layers = under ? seenLayersOf(under.widget) : [];
		const root = under ? hitRootOf(layer, under) : null;
		if (!under || !root || layers.length === 0) return null;
		const drawn = under.element.getBoundingClientRect();
		const scale = drawn.width / Math.max(1, under.element.offsetWidth);
		const at = { x: (event.clientX - drawn.left) / scale, y: (event.clientY - drawn.top) / scale };
		const hit = pickedHit(hitsAt(root, layers, at), parentsOf(layers), picked?.mark ?? null, depth);
		return hit ? spotOn(screenBoxOf(layer, under.element, pan.lookNow().scale), hit) : null;
	};
	const depthOf = (event: MouseEvent, depth: PickDepth): PickDepth =>
		event.metaKey || event.ctrlKey ? "deepest" : depth;
	return {
		picked,
		hovered: hovered && hovered.mark !== picked?.mark ? hovered : null,
		onFocus: (focus) => {
			const layer = layerRef.current;
			const screen = focus ? firstScreenOf(layer, focus.screen) : null;
			const next = focus && layer && screen ? spotOn(screenBoxOf(layer, screen, pan.lookNow().scale), focus.hit) : null;
			setPicked(next);
			if (next) pan.flyTo(lookOnto(next.target, pan.fieldRef.current));
		},
		clear: () => setPicked(null),
		pointing: {
			onMouseMove: (event) => {
				const next = spotAt(event, depthOf(event, "level"));
				setHovered((shown) => (isSameSpot(shown, next) ? shown : next));
			},
			onMouseLeave: () => setHovered(null),
			onClick: (event) => {
				if (event.target instanceof Element && event.target.closest(CHROME)) return;
				setPicked(spotAt(event, depthOf(event, "level")));
				setHovered(null);
			},
			onDoubleClick: (event) => {
				setPicked(spotAt(event, depthOf(event, "deeper")));
				setHovered(null);
			},
		},
	};
}

function screenUnder(layer: HTMLElement, event: MouseEvent): ScreenUnder | null {
	for (const frame of layer.querySelectorAll<HTMLElement>(SCREENS)) {
		const element = frame.querySelector<HTMLElement>(".wg-design-screen");
		const drawn = element?.getBoundingClientRect();
		const widget = frame.dataset["wgScreen"];
		if (!element || !drawn || !widget) continue;
		const isInside =
			event.clientX >= drawn.left &&
			event.clientX <= drawn.right &&
			event.clientY >= drawn.top &&
			event.clientY <= drawn.bottom;
		if (isInside) return { element, widget };
	}
	return null;
}

function hitRootOf(layer: HTMLElement, under: ScreenUnder): HTMLElement | null {
	if (under.element.querySelector("[data-wg-node]")) return under.element;
	if (firstScreenOf(layer, under.widget) !== under.element) return null;
	return document.querySelector<HTMLElement>(`[${LIVE_SCREEN}="${CSS.escape(under.widget)}"]`);
}
