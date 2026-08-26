import { CLASSES } from "./paths.js";

const EMPTY_LAYOUTS = () => Object.fromEntries(CLASSES.map((entry) => [entry.name, []]));

function normalizeSources(input) {
	const result = {};
	for (const [name, value] of Object.entries(input ?? {})) {
		result[name] = { path: value.path ?? "", filters: value.filters ?? [], sort: value.sort ?? [] };
	}
	return result;
}

function normalizeTile(tile, index) {
	return {
		id: tile.id ?? `w${index}`,
		widget: tile.widget,
		settings: tile.settings ?? {},
		sources: normalizeSources(tile.sources ?? tile.data),
	};
}

function normalizePlace(place, index) {
	return {
		id: place.id ?? `w${index}`,
		x: place.x ?? 0,
		y: place.y ?? 0,
		w: place.w ?? 3,
		h: place.h ?? 2,
	};
}

// a bare array is the pre-classes format: those coordinates were authored on 12 columns
export function normalizeBoard(input) {
	if (Array.isArray(input)) {
		const layouts = EMPTY_LAYOUTS();
		layouts.tablet = input.map(normalizePlace);
		return { tiles: input.map(normalizeTile), layouts };
	}

	const layouts = EMPTY_LAYOUTS();
	for (const entry of CLASSES) {
		layouts[entry.name] = (input?.layouts?.[entry.name] ?? []).map(normalizePlace);
	}
	return { tiles: (input?.tiles ?? []).map(normalizeTile), layouts };
}

export function serializeBoard(board) {
	return {
		tiles: board.tiles.map((tile) => ({
			id: tile.id,
			widget: tile.widget,
			...(Object.keys(tile.settings ?? {}).length ? { settings: tile.settings } : {}),
			...(Object.keys(tile.sources ?? {}).length ? { sources: tile.sources } : {}),
		})),
		layouts: Object.fromEntries(
			CLASSES.map((entry) => [
				entry.name,
				board.layouts[entry.name].map((place) => ({ id: place.id, x: place.x, y: place.y, w: place.w, h: place.h })),
			]),
		),
	};
}

export function tileById(board, id) {
	return board.tiles.find((tile) => tile.id === id) ?? null;
}

export function placedIds(board, className) {
	return new Set(board.layouts[className].map((place) => place.id));
}
