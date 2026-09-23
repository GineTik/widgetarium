import { createContext } from "react";
import { APART, COLUMN, GROUP, NO_SURFACE, ROW, SIDES, SURFACE_WAS } from "../constants/surfaces";
import { isPainted, plateRefusal, platesWithin } from "./plate-laws";

export { GROUP, NO_SURFACE };

const SIDE_WORD = { kind: "side", allowed: SIDES, fallback: "end" };
const ACROSS_WORD = { kind: "direction", allowed: [ROW, COLUMN], fallback: COLUMN };
const saidAlready = new Set();

export function warnOnce(line) {
	if (saidAlready.has(line)) return;
	saidAlready.add(line);
	console.warn(`Widgetarium: ${line}`);
}

export const PLATES_ABOVE = createContext({ surface: NO_SURFACE, levels: 0, ownPlates: 0 });

export function platesAtCell(cell) {
	return { surface: cell.underSurface ?? NO_SURFACE, levels: cell.plates ?? 0, ownPlates: 0 };
}

export function wornPlate(above, said) {
	const surface = SURFACE_WAS[said] ?? said;
	const refusal = plateRefusal(above, surface);
	return refusal ? { surface: NO_SURFACE, refusal } : { surface, refusal: null };
}

export function platesInside(above, surface) {
	const isPlate = isPainted({ surface });
	return {
		surface: isPlate ? surface : above.surface,
		levels: platesWithin(above, surface),
		ownPlates: above.ownPlates + (isPlate ? 1 : 0),
	};
}

export function plateProps(above, { surface, side, across, style }) {
	return { ...plateAttrs(surface, side, across), style: { ...plateStyle(above, surface), ...style } };
}

function plateAttrs(surface, side, across) {
	if (surface === NO_SURFACE) return {};
	if (surface !== APART) return { "data-surface": surface };
	return {
		"data-surface": APART,
		"data-side": wornWord(side, SIDE_WORD),
		"data-across": wornWord(across, ACROSS_WORD),
	};
}

function plateStyle(above, surface) {
	if (!isPainted({ surface })) return null;
	return { "--wg-surface-corner": above.ownPlates === 0 ? "var(--wg-kit-plate)" : "var(--wg-kit-item)" };
}

function wornWord(said, { kind, allowed, fallback }) {
	if (said === undefined || said === null) return fallback;
	if (allowed.includes(said)) return said;
	warnOnce(`${said} is no ${kind}, so ${fallback} was drawn instead: ${allowed.join(", ")}`);
	return fallback;
}
