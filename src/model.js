import { arrange, clampPlace } from "./layout.js";

// The pre-columns format named its layouts after device classes, and each name carried a
// fixed column count, so the move to numeric keys is 1:1 and loses nothing. These are
// FROZEN history, not the live config: retuning the grid must not rewrite what an old
// file meant when it was saved.
const LEGACY_COLUMNS = { phone: 4, tablet: 12, desktop: 20 };
const LEGACY_BARE_ARRAY_COLUMNS = 12;

// CONTEXT: a hand-edited file can carry a null here, and one bad entry must not lose the board
function normalizeSources(input) {
	const result = {};
	for (const [name, value] of Object.entries(input ?? {})) {
		result[name] = { path: value?.path ?? "", filters: value?.filters ?? [], sort: value?.sort ?? [] };
	}
	return result;
}

// CONTEXT: a tile that mounts other widgets keeps their settings here, so a group is one tile
function normalizeMounted(input) {
	const result = {};
	for (const [id, held] of Object.entries(input ?? {})) {
		result[id] = { settings: held?.settings ?? {}, sources: normalizeSources(held?.sources), slots: normalizeSlots(held?.slots), mounted: normalizeMounted(held?.mounted) };
	}
	return result;
}

// CONTEXT: which widget fills a slot, by slot name; a nameless or null pick is no pick at all
function normalizeSlots(input) {
	if (typeof input !== "object" || input === null) return {};
	const result = {};
	for (const [name, widget] of Object.entries(input)) {
		if (typeof widget === "string" && widget !== "") result[name] = widget;
	}
	return result;
}

// TRADE-OFF: a name alone, no stored type — the dialog anchors the control off the name
// CONTEXT: anchors ignore case, so two spellings are one property; the first spelling is kept
export function normalizeProperties(input) {
	if (!Array.isArray(input)) return [];
	const kept = [];
	const claimed = new Set();
	for (const entry of input) {
		const name = typeof entry === "string" ? entry.trim() : "";
		if (name === "" || claimed.has(name.toLowerCase())) continue;
		claimed.add(name.toLowerCase());
		kept.push(name);
	}
	return kept;
}

function normalizeTile(tile, index) {
	return {
		id: tile.id ?? `w${index}`,
		widget: tile.widget,
		settings: tile.settings ?? {},
		sources: normalizeSources(tile.sources ?? tile.data),
		slots: normalizeSlots(tile.slots),
		mounted: normalizeMounted(tile.mounted),
		// Folded or not is a fact about the WIDGET, not about one screen width. Kept on the
		// place it was stored once per layout, so a board with four layouts held four
		// opinions and the sidebar sprang open at whichever width was authored first.
		...(tile.folded ? { folded: true } : {}),
	};
}

function normalizePlace(place, index) {
	return {
		id: place.id ?? `w${index}`,
		x: place.x ?? 0,
		y: place.y ?? 0,
		w: place.w ?? 3,
		h: place.h ?? 2,
		// The width a folded tile goes back to. It belongs to the PLACE, not the tile: folded
		// is one fact about the widget, but how wide it was is a fact about this screen — a
		// panel folded on a phone must not decide what it reopens to on a desktop.
		// restoreW is what this field was called before folded moved onto the tile
		...(place.wasW ?? place.restoreW ? { wasW: place.wasW ?? place.restoreW } : {}),
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
	// CONTEXT: entries are tiles AND places at once; delegating keeps one promised shape
	if (Array.isArray(input)) return normalizeBoard({ tiles: input, layouts: { [LEGACY_BARE_ARRAY_COLUMNS]: input } });
	// LEGACY: folded used to live on the place, once per layout, under the name restoreW. A
	// file written then still opens, and its panel is still folded — read off whichever layout
	// recorded it, because the fact was always about the tile.
	const foldedOnce = new Set();
	for (const layout of Object.values(input?.layouts ?? {})) {
		// the RAW entry: normalizePlace has already dropped the field by the time it runs
		const raw = Array.isArray(layout) ? layout : (layout?.places ?? []);
		for (const place of raw) {
			if (place?.restoreW) foldedOnce.add(place.id);
		}
	}

	return {
		tiles: (input?.tiles ?? []).map((tile, index) => {
			const seen = normalizeTile(tile, index);
			return foldedOnce.has(seen.id) ? { ...seen, folded: true } : seen;
		}),
		layouts: normalizeLayouts(input?.layouts),
		// One board, two sizes. The mode is a fact about the board, so it lives in the file:
		// held in a hook it was lost to every re-render the editor caused, which read as
		// "any keystroke collapses the page".
		mode: input?.mode === "expanded" ? "expanded" : "collapsed",
		// the board's shared selection: which board, project or view the widgets are on
		context: { ...(input?.context ?? {}) },
		properties: normalizeProperties(input?.properties),
	};
}

// CONTEXT: a view never opened has nothing to say, and an empty record in the file reads as one that does
function serializeMounted(input) {
	const result = {};
	for (const [id, held] of Object.entries(input ?? {})) {
		const nested = serializeMounted(held.mounted);
		const kept = {
			...(Object.keys(held.settings ?? {}).length ? { settings: held.settings } : {}),
			...(Object.keys(held.sources ?? {}).length ? { sources: held.sources } : {}),
			...(Object.keys(held.slots ?? {}).length ? { slots: held.slots } : {}),
			...(nested ? { mounted: nested } : {}),
		};
		if (Object.keys(kept).length) result[id] = kept;
	}
	return Object.keys(result).length ? result : null;
}

function serializeTile(tile) {
	const mounted = serializeMounted(tile.mounted);
	return {
		id: tile.id,
		widget: tile.widget,
		...(tile.folded ? { folded: true } : {}),
		...(Object.keys(tile.settings ?? {}).length ? { settings: tile.settings } : {}),
		...(Object.keys(tile.sources ?? {}).length ? { sources: tile.sources } : {}),
		...(Object.keys(tile.slots ?? {}).length ? { slots: tile.slots } : {}),
		...(mounted ? { mounted } : {}),
	};
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
		tiles: board.tiles.map(serializeTile),
		// only authored counts reach the file: a derived layout is one render's worth of
		// arithmetic, and writing it would mark a width the user never touched as theirs
		...(board.mode === "expanded" ? { mode: "expanded" } : {}),
		...(Object.keys(board.context ?? {}).length ? { context: board.context } : {}),
		...(board.properties?.length ? { properties: board.properties } : {}),
		layouts: Object.fromEntries(
			authoredColumns(board).map((columns) => [
				String(columns),
				{ places: board.layouts[columns].map((place) => ({ id: place.id, x: place.x, y: place.y, w: place.w, h: place.h, ...(place.wasW ? { wasW: place.wasW } : {}) })) },
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

// What a widget declares, by tile id — where it is born and whether it grows. Threaded in
// rather than read here, because the model must not know the registry exists. Neither answer
// can make a layout impossible, which is the whole point of replacing the old limits.
export function layoutFor(board, columns, declaredBy = () => ({})) {
	const growthOf = (place) => declaredBy(place.id ?? place)?.growth ?? "fill";
	const own = board.layouts[columns];
	if (own) {
		const places = own.map((place) => clampPlace(place, columns));
		return { places: arrange(seatAll(board, places, columns, declaredBy), columns, { reading: true }), isAuthored: true };
	}

	const source = sourceColumnsFor(board, columns);
	const derived = source === null ? [] : arrange(board.layouts[source], columns, { scaleFrom: source, growthOf });
	return { places: arrange(seatAll(board, derived, columns, declaredBy), columns, { reading: true }), isAuthored: false };
}

// ONE board, whatever the width. A tile added at one column count had a place only there, so
// a narrower or wider screen dropped it entirely and the two read as different boards. A tile
// exists on the board or it does not; where it sits is per width, whether it sits is not.
function seatAll(board, places, columns, declaredBy) {
	const seated = new Set(places.map((place) => place.id));
	const missing = board.tiles.filter((tile) => !seated.has(tile.id));
	if (missing.length === 0) return places;

	let row = places.reduce((lowest, place) => Math.max(lowest, place.y + place.h), 0);
	const added = missing.map((tile) => {
		const born = declaredBy(tile.id)?.defaultSize ?? { w: 3, h: 2 };
		const place = clampPlace({ id: tile.id, x: 0, y: row, w: born.w ?? 3, h: born.h ?? 2 }, columns);
		row += place.h;
		return place;
	});
	return [...places, ...added];
}

export function tileById(board, id) {
	return board.tiles.find((tile) => tile.id === id) ?? null;
}

export function placedIds(board, columns) {
	return new Set(layoutFor(board, columns).places.map((place) => place.id));
}
