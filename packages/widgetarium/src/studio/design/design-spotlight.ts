import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import type { Box } from "../canvas/flight.js";
import type { Look } from "../canvas/pan-zoom.js";
import type { Hit } from "./design-selection.js";

export interface Spot {
	readonly mark: string;
	readonly screen: Box;
	readonly target: Box;
	readonly radius: number;
}

export type SpotTone = "hover" | "picked";

const TOP_BAR_PX = 80;
const MARGIN_PX = 48;
const DRAWN_LIVE_FROM = 0.6;
const CLOSEST = 1;
const OPEN_LAYERS = ".wg-design-layers.is-open";
const LEAVES_AFTER_MS = 200;

export function firstScreenOf(layer: HTMLElement | null, widget: string): HTMLElement | null {
	const screen = layer?.querySelector(`.wg-design-frame[data-wg-screen="${CSS.escape(widget)}"] .wg-design-screen`);
	return screen instanceof HTMLElement ? screen : null;
}

export function screenBoxOf(layer: HTMLElement, screen: HTMLElement, scale: number): Box {
	const origin = layer.getBoundingClientRect();
	const drawn = screen.getBoundingClientRect();
	return {
		x: (drawn.left - origin.left) / scale,
		y: (drawn.top - origin.top) / scale,
		width: drawn.width / scale,
		height: drawn.height / scale,
	};
}

export function spotOn(screen: Box, hit: Hit): Spot {
	return {
		mark: hit.mark,
		screen,
		target: { ...hit.box, x: screen.x + hit.box.x, y: screen.y + hit.box.y },
		radius: hit.radius,
	};
}

export function isSameSpot(a: Spot | null, b: Spot | null): boolean {
	return a?.mark === b?.mark && a?.target.x === b?.target.x && a?.target.y === b?.target.y;
}

export function lookOnto(target: Box, field: HTMLElement | null): Look {
	const panel = field?.querySelector(OPEN_LAYERS);
	const left = panel instanceof HTMLElement ? panel.offsetWidth : 0;
	const width = (field?.clientWidth ?? 0) - left - 2 * MARGIN_PX;
	const height = (field?.clientHeight ?? 0) - TOP_BAR_PX - 2 * MARGIN_PX;
	const fitted = Math.min(width / target.width, height / target.height);
	const scale = Math.min(CLOSEST, Math.max(DRAWN_LIVE_FROM, fitted));
	return {
		scale,
		x: placedOn(left + MARGIN_PX, width, target.x, target.width, scale),
		y: placedOn(TOP_BAR_PX + MARGIN_PX, height, target.y, target.height, scale),
	};
}

export function Highlight({
	spot,
	tone,
}: {
	readonly spot: Spot | null;
	readonly tone: SpotTone;
}): ReactElement | null {
	const { shown, isLeaving } = useFading(spot);
	if (!shown) return null;
	const { target, radius } = shown;
	return h("div", {
		className: `wg-design-spot is-${tone}${isLeaving ? " is-leaving" : ""}`,
		style: { left: target.x, top: target.y, width: target.width, height: target.height, borderRadius: radius },
	});
}

function useFading(spot: Spot | null): { readonly shown: Spot | null; readonly isLeaving: boolean } {
	const [last, setLast] = useState<Spot | null>(spot);
	useEffect(() => {
		if (spot) return void setLast(spot);
		const timer = window.setTimeout(() => setLast(null), LEAVES_AFTER_MS);
		return () => window.clearTimeout(timer);
	}, [spot]);
	return { shown: spot ?? last, isLeaving: spot === null };
}

function placedOn(start: number, room: number, at: number, size: number, scale: number): number {
	if (size * scale > room) return start - at * scale;
	return start + room / 2 - (at + size / 2) * scale;
}
