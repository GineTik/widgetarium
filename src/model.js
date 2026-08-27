import { clampPlace, generatePlaces, packPlaces } from "./layout.js";

// The pre-columns format named its layouts after device classes, and each name carried a
// fixed column count, so the move to numeric keys is 1:1 and loses nothing. These are
// FROZEN history, not the live config: retuning the grid must not rewrite what an old
// file meant when it was saved.
const LEGACY_COLUMNS = { phone: 4, tablet: 12, desktop: 20 };
const LEGACY_BARE_ARRAY_COLUMNS = 12;

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

function readEntry(value) {
	const places = Array.isArray(value) ? value : (value?.places ?? []);
	return places.map(normalizePlace);
}

// An absent layout and an empty one are different: an empty AUTHORED layout means "this
// width is deliberately blank", while absence means "derive it". Dropping empties on the
// way in is what lets a freshly migrated board derive instead of arriving blank three times.
function normalizeLayouts(input) {
	const layouts = {};
	for (const [key, value] of Object.entries(input ?? {})) {
		const columns = LEGACY_COLUMNS[key] ?? Number(key);
		if (!Number.isFinite(columns) || columns < 1) continue;
		const places = readEntry(value);
		if (places.length === 0) continue;
		layouts[columns] = places;
	}
	return layouts;
}

export function normalizeBoard(input) {
	if (Array.isArray(input)) {
		const places = input.map(normalizePlace);
		return { tiles: input.map(normalizeTile), layouts: places.length ? { [LEGACY_BARE_ARRAY_COLUMNS]: places } : {} };
	}
	return { tiles: (input?.tiles ?? []).map(normalizeTile), layouts: normalizeLayouts(input?.layouts) };
}

export function serializeBoard(board) {
	// The warning lives HERE and not in authoredColumns, which runs on every render: this
	// is the one place a key that is not a column count actually loses data. A layout
	// written under the old class name is dropped on save, which is how an added widget
	// once vanished without a sound.
	for (const key of Object.keys(board.layouts)) {
		if (!Number.isFinite(Number(key))) {
			console.warn(`Widgetarium: layout key "${key}" is not a column count and was not saved`);
		}
	}
	return {
		tiles: board.tiles.map((tile) => ({
			id: tile.id,
			widget: tile.widget,
			...(Object.keys(tile.settings ?? {}).length ? { settings: tile.settings } : {}),
			...(Object.keys(tile.sources ?? {}).length ? { sources: tile.sources } : {}),
		})),
		// only authored counts reach the file: a derived layout is one render's worth of
		// arithmetic, and writing it would mark a width the user never touched as theirs
		layouts: Object.fromEntries(
			authoredColumns(board).map((columns) => [
				String(columns),
				{ places: board.layouts[columns].map((place) => ({ id: place.id, x: place.x, y: place.y, w: place.w, h: place.h })) },
			]),
		),
	};
}

export function authoredColumns(board) {
	return Object.keys(board.layouts)
		.map(Number)
		.filter(Number.isFinite)
		.sort((left, right) => left - right);
}

// nearest authored count by column distance; a tie goes to the LARGER, because shrinking a
// layout has somewhere to give — minimum sizes, then a wrapped row — and growing has nothing
// to fill with. The seam therefore lands midway between two authored counts, the width the
// user sits at least often, and one edit there removes it for good.
export function sourceColumnsFor(board, columns) {
	const authored = authoredColumns(board);
	if (authored.length === 0) return null;
	let best = authored[0];
	for (const candidate of authored) {
		const gap = Math.abs(candidate - columns);
		const bestGap = Math.abs(best - columns);
		if (gap < bestGap || (gap === bestGap && candidate > best)) best = candidate;
	}
	return best;
}

export function layoutFor(board, columns) {
	const own = board.layouts[columns];
	if (own) return { places: packPlaces(own.map((place) => clampPlace(place, columns))), isAuthored: true };

	const source = sourceColumnsFor(board, columns);
	if (source === null) return { places: [], isAuthored: false };
	return { places: generatePlaces(board.layouts[source], source, columns), isAuthored: false };
}

export function tileById(board, id) {
	return board.tiles.find((tile) => tile.id === id) ?? null;
}

export function placedIds(board, columns) {
	return new Set(layoutFor(board, columns).places.map((place) => place.id));
}
