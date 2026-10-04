import {
	BAR_GAP,
	BAR_STROKE,
	CIRCLE_AMPLITUDE,
	CIRCLE_WAVELENGTH,
	CURSOR_HEIGHT,
	CURSOR_WIDTH,
	PROGRESS_MAX,
	RING_PX_PER_STROKE,
	RING_STROKE_MIN,
	TAU,
	WAVELENGTH,
	WAVE_AMPLITUDE,
	WAVE_STEP_PX,
} from "../constants/progress";
import { clampPercent } from "./progress";

export interface BarLook {
	readonly isWavy?: boolean;
	readonly isCursorVisible?: boolean;
}

export interface CircleLook {
	readonly isWavy?: boolean;
}

export interface BarCursor {
	readonly x: number;
	readonly width: number;
}

export interface BarGeometry {
	readonly height: number;
	readonly middle: number;
	readonly active: string | null;
	readonly track: string | null;
	readonly stop: number;
	readonly cursor: BarCursor | null;
}

export interface CircleGeometry {
	readonly size: number;
	readonly middle: number;
	readonly radius: number;
	readonly stroke: number;
	readonly active: string | null;
	readonly track: string | null;
}

interface BarEdges {
	readonly start: number;
	readonly end: number;
	readonly activeEnd: number;
	readonly trackStart: number;
	readonly cursorX?: number;
}

interface RingArc {
	readonly from: number;
	readonly sweep: number;
}

export function barGeometry(
	width: number,
	percent: unknown,
	{ isWavy = true, isCursorVisible = false }: BarLook = {},
): BarGeometry {
	const share = clampPercent(percent) / PROGRESS_MAX;
	const height = barHeight(isWavy, isCursorVisible);
	const middle = height / 2;
	const { start, end, activeEnd, trackStart, cursorX } = barEdges(width, share, isCursorVisible);
	const isActiveDrawn = share > 0 && activeEnd > start;
	return {
		height,
		middle,
		active: isActiveDrawn ? wavePath(start, activeEnd, middle, isWavy ? WAVE_AMPLITUDE : 0) : null,
		track: trackStart < end ? `M${trackStart} ${middle}L${end} ${middle}` : null,
		stop: end,
		cursor: cursorX === undefined ? null : { x: cursorX - CURSOR_WIDTH / 2, width: CURSOR_WIDTH },
	};
}

export function circleGeometry(size: number, percent: unknown, { isWavy = true }: CircleLook = {}): CircleGeometry {
	const share = clampPercent(percent) / PROGRESS_MAX;
	const amplitude = isWavy ? CIRCLE_AMPLITUDE : 0;
	const middle = size / 2;
	const stroke = ringStrokeOf(size);
	const radius = middle - stroke / 2 - amplitude;
	const gap = ((BAR_GAP * stroke) / BAR_STROKE + stroke) / radius;
	const top = -Math.PI / 2;
	const track = ringTrack(share, gap);
	return {
		size,
		middle,
		radius,
		stroke,
		active:
			share > 0 ? ringPath(middle, radius, { from: top, sweep: share * TAU }, amplitude, ringWavesOf(radius)) : null,
		track: track ? ringPath(middle, radius, { from: top + track.from, sweep: track.sweep }, 0, 1) : null,
	};
}

export function ringStrokeOf(size: number): number {
	return Math.min(BAR_STROKE, Math.max(RING_STROKE_MIN, Math.round(size / RING_PX_PER_STROKE)));
}

function wavePath(from: number, to: number, middle: number, amplitude: number): string {
	const points = [`M${from} ${middle}`];
	for (let x = from + WAVE_STEP_PX; x < to; x += WAVE_STEP_PX)
		points.push(`L${x} ${waveY(x - from, middle, amplitude)}`);
	points.push(`L${to} ${waveY(to - from, middle, amplitude)}`);
	return points.join("");
}

function waveY(along: number, middle: number, amplitude: number): number {
	return +(middle - amplitude * Math.sin((2 * Math.PI * along) / WAVELENGTH)).toFixed(2);
}

function barHeight(isWavy: boolean, isCursorVisible: boolean): number {
	if (isCursorVisible) return CURSOR_HEIGHT;
	if (isWavy) return 2 * WAVE_AMPLITUDE + BAR_STROKE;
	return BAR_STROKE;
}

function barEdges(width: number, share: number, isCursorVisible: boolean): BarEdges {
	const start = BAR_STROKE / 2;
	const end = width - BAR_STROKE / 2;
	const at = start + share * (end - start);
	if (!isCursorVisible) return { start, end, activeEnd: at, trackStart: share === 0 ? at : at + BAR_STROKE + BAR_GAP };
	const cursorX = Math.min(width - CURSOR_WIDTH / 2, Math.max(CURSOR_WIDTH / 2, at));
	const reach = CURSOR_WIDTH / 2 + BAR_GAP + BAR_STROKE / 2;
	return { start, end, activeEnd: cursorX - reach, trackStart: cursorX + reach, cursorX };
}

function ringPath(middle: number, radius: number, arc: RingArc, amplitude: number, waves: number): string {
	const { from, sweep } = arc;
	const steps = Math.max(2, Math.round((Math.abs(sweep) * radius) / WAVE_STEP_PX));
	const points: string[] = [];
	for (let step = 0; step <= steps; step += 1) {
		const angle = from + (sweep * step) / steps;
		const reach = radius + amplitude * Math.sin((angle - from) * waves);
		const x = +(middle + reach * Math.cos(angle)).toFixed(2);
		const y = +(middle + reach * Math.sin(angle)).toFixed(2);
		points.push(`${step === 0 ? "M" : "L"}${x} ${y}`);
	}
	return points.join("");
}

function ringWavesOf(radius: number): number {
	return Math.max(1, Math.round((TAU * radius) / CIRCLE_WAVELENGTH));
}

function ringTrack(share: number, gap: number): RingArc | null {
	if (share === 0) return { from: 0, sweep: TAU };
	const from = share * TAU + gap;
	const sweep = TAU - share * TAU - 2 * gap;
	return sweep > 0 ? { from, sweep } : null;
}
