import {
	BAR_GAP,
	BAR_STROKE,
	CIRCLE_AMPLITUDE,
	CIRCLE_WAVELENGTH,
	CURSOR_HEIGHT,
	CURSOR_WIDTH,
	PROGRESS_MAX,
	TAU,
	WAVELENGTH,
	WAVE_AMPLITUDE,
	WAVE_STEP_PX,
} from "../constants/progress";
import { clampPercent } from "./progress";

function wavePath(from, to, middle, amplitude) {
	const points = [`M${from} ${middle}`];
	for (let x = from + WAVE_STEP_PX; x < to; x += WAVE_STEP_PX)
		points.push(`L${x} ${waveY(x - from, middle, amplitude)}`);
	points.push(`L${to} ${waveY(to - from, middle, amplitude)}`);
	return points.join("");
}

function waveY(along, middle, amplitude) {
	return +(middle - amplitude * Math.sin((2 * Math.PI * along) / WAVELENGTH)).toFixed(2);
}

function barHeight(isWavy, isCursorVisible) {
	if (isCursorVisible) return CURSOR_HEIGHT;
	if (isWavy) return 2 * WAVE_AMPLITUDE + BAR_STROKE;
	return BAR_STROKE;
}

function barEdges(width, share, isCursorVisible) {
	const start = BAR_STROKE / 2;
	const end = width - BAR_STROKE / 2;
	const at = start + share * (end - start);
	if (!isCursorVisible) return { start, end, activeEnd: at, trackStart: share === 0 ? at : at + BAR_STROKE + BAR_GAP };
	const cursorX = Math.min(width - CURSOR_WIDTH / 2, Math.max(CURSOR_WIDTH / 2, at));
	const reach = CURSOR_WIDTH / 2 + BAR_GAP + BAR_STROKE / 2;
	return { start, end, activeEnd: cursorX - reach, trackStart: cursorX + reach, cursorX };
}

export function barGeometry(width, percent, { isWavy = true, isCursorVisible = false } = {}) {
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
		cursor: isCursorVisible ? { x: cursorX - CURSOR_WIDTH / 2, width: CURSOR_WIDTH } : null,
	};
}

function ringPath(middle, radius, from, sweep, amplitude, waves) {
	const steps = Math.max(2, Math.round((Math.abs(sweep) * radius) / WAVE_STEP_PX));
	const points = [];
	for (let step = 0; step <= steps; step += 1) {
		const angle = from + (sweep * step) / steps;
		const reach = radius + amplitude * Math.sin((angle - from) * waves);
		const x = +(middle + reach * Math.cos(angle)).toFixed(2);
		const y = +(middle + reach * Math.sin(angle)).toFixed(2);
		points.push(`${step === 0 ? "M" : "L"}${x} ${y}`);
	}
	return points.join("");
}

function ringWavesOf(radius) {
	return Math.max(1, Math.round((TAU * radius) / CIRCLE_WAVELENGTH));
}

function ringTrack(share, gap) {
	if (share === 0) return { from: 0, sweep: TAU };
	const from = share * TAU + gap;
	const sweep = TAU - share * TAU - 2 * gap;
	return sweep > 0 ? { from, sweep } : null;
}

export function circleGeometry(size, percent, { isWavy = true } = {}) {
	const share = clampPercent(percent) / PROGRESS_MAX;
	const amplitude = isWavy ? CIRCLE_AMPLITUDE : 0;
	const middle = size / 2;
	const radius = middle - BAR_STROKE / 2 - amplitude;
	const gap = (BAR_GAP + BAR_STROKE) / radius;
	const top = -Math.PI / 2;
	const track = ringTrack(share, gap);
	return {
		size,
		middle,
		radius,
		active: share > 0 ? ringPath(middle, radius, top, share * TAU, amplitude, ringWavesOf(radius)) : null,
		track: track ? ringPath(middle, radius, top + track.from, track.sweep, 0, 1) : null,
	};
}
