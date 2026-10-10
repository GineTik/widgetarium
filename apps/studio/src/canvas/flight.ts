import type { Size } from "./frame-size.js";
import type { Look } from "./pan-zoom.js";

export interface Flight {
	readonly lookAt: (share: number) => Look;
	readonly ms: number;
}

export interface Box {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

const RHO = Math.SQRT2;
const MS_PER_STEP = 700;
const SHORTEST_MS = 450;
const LONGEST_MS = 1300;
const STILL_BELOW = 1e-6;

export function flightBetween(from: Look, to: Look, view: Size): Flight {
	const start = centredOf(from, view);
	const end = centredOf(to, view);
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const distance = Math.hypot(dx, dy);
	const path = distance < STILL_BELOW ? zoomOnly(start.width, end.width) : arced(start.width, end.width, distance);
	const ms = Math.min(LONGEST_MS, Math.max(SHORTEST_MS, path.steps * MS_PER_STEP));
	return {
		ms,
		lookAt: (share) => {
			const { along, width } = path.at(easedInOut(share));
			return lookOf({ x: start.x + along * dx, y: start.y + along * dy, width }, view);
		},
	};
}

export function easedInOut(share: number): number {
	return share < 0.5 ? 4 * share ** 3 : 1 - (-2 * share + 2) ** 3 / 2;
}

interface Path {
	readonly steps: number;
	readonly at: (share: number) => { readonly along: number; readonly width: number };
}

function zoomOnly(from: number, to: number): Path {
	const steps = Math.log(to / from) / RHO;
	return { steps: Math.abs(steps), at: (share) => ({ along: share, width: from * Math.exp(RHO * share * steps) }) };
}

function arced(from: number, to: number, distance: number): Path {
	const rise = (to ** 2 - from ** 2 + RHO ** 4 * distance ** 2) / (2 * from * RHO ** 2 * distance);
	const fall = (to ** 2 - from ** 2 - RHO ** 4 * distance ** 2) / (2 * to * RHO ** 2 * distance);
	const r0 = Math.log(Math.sqrt(rise ** 2 + 1) - rise);
	const r1 = Math.log(Math.sqrt(fall ** 2 + 1) - fall);
	const steps = (r1 - r0) / RHO;
	return {
		steps,
		at: (share) => {
			const s = share * steps;
			const along = (from / (RHO ** 2 * distance)) * (Math.cosh(r0) * Math.tanh(RHO * s + r0) - Math.sinh(r0));
			return { along, width: (from * Math.cosh(r0)) / Math.cosh(RHO * s + r0) };
		},
	};
}

function centredOf(look: Look, view: Size): { readonly x: number; readonly y: number; readonly width: number } {
	return {
		x: (view.width / 2 - look.x) / look.scale,
		y: (view.height / 2 - look.y) / look.scale,
		width: view.width / look.scale,
	};
}

function lookOf(centre: { readonly x: number; readonly y: number; readonly width: number }, view: Size): Look {
	const scale = view.width / centre.width;
	return { scale, x: view.width / 2 - centre.x * scale, y: view.height / 2 - centre.y * scale };
}
