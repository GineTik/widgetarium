import {
	ADAPTIVE,
	ALWAYS,
	COLLAPSES,
	DRAWER,
	TOGGLES,
	COLUMN,
	APART,
	handedDown,
	isBox,
	leavesOf,
	pathOfLeaf,
	pixelHeight,
	pruned,
	replacedAt,
	ROW,
	SIDES,
	SURFACES,
	SURFACE_WAS,
	SWAP,
} from "./tree.js";
import { BLOCK_FORMAT } from "./version.js";
import { widgetKeyOf } from "./engine/widget-ref.js";
import { isKnownRole, SLOT_SURFACES } from "./surface-roles.js";
import { withDefaultSurfaces } from "./surface-default.js";

const LEGACY_CLASS_COLUMNS = { phone: 4, tablet: 12, desktop: 20 };

// CONTEXT: a board read without a registry cannot know a widget was renamed, and keeps what it has
const SAME_ID = (id) => id;

// CONTEXT: a slot used to persist as the widget id alone, a mount as a record keyed by that id
function heldWidget(input, keyWidget) {
	if (typeof input === "string") return input === "" ? null : input;
	if (typeof input?.widget === "string" && input.widget !== "") return input.widget;
	return keyWidget;
}

// CONTEXT: a slot and a mount are one record — whether the parent feeds it is the manifest's answer
function normalizeHeld(input, keyWidget, idOf) {
	const widget = heldWidget(input, keyWidget);
	if (typeof widget !== "string" || widget === "") return null;
	const held = typeof input === "object" && input !== null ? input : {};
	return {
		widget: idOf(widget),
		settings: held.settings ?? {},
		mounts: held.mounts ?? {},
		props: held.props ?? {},
		slots: normalizeSlots(held.slots, idOf),
		mounted: normalizeMounted(held.mounted, idOf),
	};
}

// CONTEXT: a mount key is the widget id, with #n on a repeat — a record written before this carries no widget
function normalizeMounted(input, idOf = SAME_ID) {
	if (typeof input !== "object" || input === null) return {};
	const result = {};
	for (const [key, held] of Object.entries(input)) {
		const record = normalizeHeld(held, key.split("#")[0], idOf);
		if (record) result[key] = record;
	}
	return result;
}

const isHeldProps = (props) => typeof props === "object" && props !== null && Object.keys(props).length > 0;

// CONTEXT: a slot key is a manifest name and names no widget, so a nameless pick is no pick
function normalizeSlots(input, idOf = SAME_ID) {
	if (typeof input !== "object" || input === null) return {};
	const result = {};
	for (const [name, held] of Object.entries(input)) {
		const record = normalizeHeld(held, null, idOf);
		const worn = SLOT_SURFACES.includes(held?.surface) ? { surface: held.surface } : null;
		const set = isHeldProps(held?.props) ? { props: held.props } : null;
		if (record || worn || set) result[name] = { ...set, ...record, ...worn };
	}
	return result;
}

// CONTEXT: the SLOT, not the widget id — the same widget held twice is two of these
// TRADE-OFF: the live widget wins over the record's, which is a mirror of it
export function heldTile(holder, hold, key, widget) {
	const held = holder[hold]?.[key] ?? {};
	return {
		id: `${holder.id}/${key}`,
		widget,
		settings: held.settings ?? {},
		mounts: held.mounts ?? {},
		props: held.props ?? {},
		slots: held.slots ?? {},
		mounted: held.mounted ?? {},
	};
}

// CONTEXT: the key a mount was stored under while the widget id was the key
export function mountKeys(ids) {
	const taken = new Map();
	return ids.map((id) => {
		const nth = (taken.get(id) ?? 0) + 1;
		taken.set(id, nth);
		return nth === 1 ? id : `${id}#${nth}`;
	});
}

// CONTEXT: the old shape is a comma list of widget ids, the new one substitution's { name, widget }
function rowsOf(value) {
	const list = Array.isArray(value) ? value : String(value ?? "").split(",");
	return (
		list
			.map((entry) =>
				typeof entry === "string"
					? { name: "", widget: entry, hidden: false }
					: { name: String(entry?.name ?? ""), widget: String(entry?.widget ?? ""), hidden: entry?.hidden === true },
			)
			.map((row) => ({ name: row.name.trim(), widget: row.widget.trim(), hidden: row.hidden }))
			// CONTEXT: a named row with no widget yet is a view waiting to be filled
			.filter((row) => row.widget !== "" || row.name !== "")
	);
}

// CONTEXT: run on every READ as well as on rename, so no stored name can shadow another
export function uniqueName(taken, wanted) {
	const base = String(wanted ?? "").trim();
	let name = base;
	let nth = 1;
	while (taken.has(name)) {
		nth += 1;
		name = `${base} ${nth}`;
	}
	taken.add(name);
	return name;
}

// CONTEXT: read where the record sits, write under the new key — that is the whole migration
export function heldKey(held, key, was) {
	return !held?.[key] && was && held?.[was] ? was : key;
}

function propKeyHeld(props, key, was) {
	if (props?.[key]) return key;
	return [].concat(was ?? []).find((old) => props?.[old]) ?? key;
}

export function propConfig(tile, key, spec) {
	return tile?.props?.[propKeyHeld(tile?.props, key, spec?.aka)] ?? {};
}

// CONTEXT: the record moves onto its new key in the same write that changes it
export function rekeyed(held, key, was, patch) {
	const { [was]: legacy, ...rest } = held ?? {};
	return { ...rest, [key]: { ...(held?.[key] ?? legacy ?? {}), ...patch } };
}

function underEitherKey(held, name, was) {
	return held?.[name] ?? (was ? held?.[was] : undefined);
}

export function mountList(tile, name, spec) {
	return (
		underEitherKey(tile?.mounts, name, spec?.was) ?? underEitherKey(tile?.settings, name, spec?.was) ?? spec?.default
	);
}

// CONTEXT: `was` is the widget-id key a note written before this still stores the record under
export function mountRows(value, nameFor) {
	const rows = rowsOf(value);
	const legacy = mountKeys(rows.map((row) => row.widget));
	const taken = new Set();
	return rows.map((row, index) => ({
		name: uniqueName(taken, row.name || nameFor?.(row.widget) || row.widget),
		widget: row.widget,
		hidden: row.hidden,
		was: legacy[index],
	}));
}

// CONTEXT: the rows and the records they key move in one write, or a rename orphans the settings
export function storedMountRow(row) {
	return { name: row.name, widget: row.widget ?? "", ...(row.hidden ? { hidden: true } : {}) };
}

function afterRenames(mounted, rows) {
	let held = mounted ?? {};
	for (const row of rows) {
		if (!row.was || row.was === row.name || !held[row.was]) continue;
		held = rekeyed(held, row.name, row.was, {});
	}
	return held;
}

export function keysStillNamed(rows) {
	const kept = new Set();
	for (const row of rows) {
		kept.add(row.name);
		if (row.was) kept.add(row.was);
	}
	return kept;
}

export function keptRecords(mounted, rows) {
	const kept = keysStillNamed(rows);
	return Object.fromEntries(Object.entries(mounted ?? {}).filter(([key]) => kept.has(key)));
}

export function mountPatch(tile, name, rows, was) {
	const kept = new Set(rows.map((row) => row.name));
	const moved = Object.entries(afterRenames(tile.mounted, rows));
	return {
		mounts: { ...withoutKey(tile.mounts, was), [name]: rows.map(storedMountRow) },
		settings: withoutKey(withoutKey(tile.settings, was), name),
		mounted: Object.fromEntries(moved.filter(([key]) => kept.has(key))),
	};
}

export function withoutKey(held, key) {
	const { [key]: dropped, ...rest } = held ?? {};
	return rest;
}

function normalizeTile(tile, index, idOf) {
	return {
		id: tile.id ?? `w${index}`,
		widget: idOf(tile.widget),
		settings: tile.settings ?? {},
		mounts: tile.mounts ?? {},
		props: tile.props ?? {},
		slots: normalizeSlots(tile.slots, idOf),
		mounted: normalizeMounted(tile.mounted, idOf),
		// Folded or not is a fact about the WIDGET, not about one screen width. Kept on the
		// place it was stored once per layout, so a board with four layouts held four
		// opinions and the sidebar sprang open at whichever width was authored first.
		...(tile.folded ? { folded: true } : {}),
	};
}

function positiveNumber(given) {
	const value = Number(given);
	return Number.isFinite(value) && value > 0 ? value : null;
}

function slotFlags(input) {
	const name = typeof input?.name === "string" && input.name !== "" ? input.name : null;
	return { ...(name ? { name } : {}), ...(input?.hidden === true ? { hidden: true } : {}), ...surfaceFields(input) };
}

function surfaceFields(input) {
	const said = SURFACE_WAS[input?.surface] ?? input?.surface;
	const surface = SURFACES.includes(said) ? said : null;
	if (!surface) return {};
	const side = surface === APART && SIDES.includes(input.side) ? input.side : null;
	return { surface, ...(side ? { side } : {}) };
}

function normalizeLeaf(input) {
	const id = typeof input === "string" ? input : input?.id;
	if (typeof id !== "string" || id === "") return null;
	const ratio = positiveNumber(input?.ratio);
	return { id, ratio: ratio ?? 1, ...sizesOf(input), ...slotFlags(input) };
}

function sizesOf(input) {
	const height = positiveNumber(input?.height);
	const heights = arrangedHeights(input?.heights);
	return { ...(height ? { height } : {}), ...(heights ? { heights } : {}) };
}

export function arrangedHeights(input) {
	if (!input || typeof input !== "object" || Array.isArray(input)) return null;
	const kept = Object.entries(input)
		.filter(([across]) => Number.isInteger(Number(across)) && Number(across) >= 1)
		.map(([across, px]) => [String(Number(across)), positiveNumber(px)])
		.filter(([, px]) => px);
	return kept.length > 0 ? Object.fromEntries(kept) : null;
}

const DIRECTIONS = new Set([ROW, COLUMN, SWAP]);

function collapseFrom(input) {
	const given = typeof input.collapse === "string" ? { into: input.collapse } : (input.collapse ?? {});
	const into = COLLAPSES.includes(given.into) ? given.into : null;
	const toggle = TOGGLES.includes(given.toggle) ? given.toggle : null;
	if (input.foldable === true) return { into: into ?? DRAWER, toggle: toggle ?? ALWAYS };
	return into ? { into, toggle: toggle ?? ADAPTIVE } : null;
}

function boxFlags(input) {
	const width = positiveNumber(input.width);
	const measure = positiveNumber(input.measure);
	const ratio = positiveNumber(input.ratio);
	const collapse = collapseFrom(input);
	return {
		...(ratio ? { ratio } : {}),
		...(width ? { width } : {}),
		...(measure ? { measure } : {}),
		...(input.keep === true ? { keep: true } : {}),
		...(collapse ? { collapse } : {}),
		...(collapse?.toggle === ALWAYS && (input.folded === true || input.collapsed === true) ? { folded: true } : {}),
		...(typeof input.trigger === "string" && input.trigger.includes("/") ? { trigger: input.trigger } : {}),
		...(input.scroll === true ? { scroll: true } : {}),
		...(typeof input.id === "string" && input.id !== "" ? { id: input.id } : {}),
		...(input.strip === false ? { strip: false } : {}),
		...(isKnownRole(input.role) ? { role: input.role } : {}),
		...(typeof input.purpose === "string" && input.purpose.trim() !== "" ? { purpose: input.purpose.trim() } : {}),
		...slotFlags(input),
	};
}

function normalizeNode(input) {
	if (!isBox(input)) return normalizeLeaf(input);
	const of = input.of.map(normalizeNode).filter(Boolean);
	const box = { dir: DIRECTIONS.has(input.dir) ? input.dir : COLUMN, of, ...boxFlags(input) };
	const height = positiveNumber(input.height);
	return height ? handedDown(box, height) : box;
}

function rowNode(cells) {
	return cells.length === 1 ? cells[0] : { dir: ROW, of: cells };
}

function nodesFromRows(rows) {
	if (!Array.isArray(rows)) return null;
	return rows
		.map((row) => (Array.isArray(row) ? row : [row]).map(normalizeLeaf).filter(Boolean))
		.filter((cells) => cells.length > 0)
		.map(rowNode);
}

function regionBox(given, flags) {
	const of = nodesFromRows(Array.isArray(given) ? given : given?.rows);
	if (!of) return null;
	return { dir: COLUMN, of, ...boxFlags({ ...(Array.isArray(given) ? {} : (given ?? {})), ...flags }) };
}

const SIDE_FLAGS = { collapse: { into: DRAWER, toggle: ALWAYS } };
const KEPT_FLAGS = { keep: true };

function sideBox(given) {
	return regionBox(given, SIDE_FLAGS) ?? { dir: COLUMN, of: [], ...SIDE_FLAGS };
}

function rootFromRegions(given) {
	if (!given || typeof given !== "object") return null;
	const kept = regionBox(Array.isArray(given) ? given : given.main, KEPT_FLAGS);
	if (!kept) return null;
	return { dir: ROW, of: [sideBox(given.left), kept, sideBox(given.right)] };
}

function placesOf(value) {
	const places = Array.isArray(value) ? value : (value?.places ?? []);
	return places
		.filter((place) => typeof place?.id === "string" && place.id !== "")
		.map((place) => ({
			id: place.id,
			x: Number(place.x) || 0,
			y: Number(place.y) || 0,
			w: Number(place.w) || 3,
			h: Number(place.h) || 2,
		}));
}

function widestPlaces(layouts) {
	let widest = null;
	let places = [];
	for (const [key, value] of Object.entries(layouts ?? {})) {
		const columns = LEGACY_CLASS_COLUMNS[key] ?? Number(key);
		const held = placesOf(value);
		if (!Number.isFinite(columns) || held.length === 0 || (widest !== null && columns <= widest)) continue;
		widest = columns;
		places = held;
	}
	return places;
}

function bandsOfPlaces(places) {
	const sorted = [...places].sort((one, other) => one.y - other.y || one.x - other.x);
	const bands = [];
	for (const place of sorted) {
		const last = bands[bands.length - 1];
		if (last && last[0].y === place.y) last.push(place);
		else bands.push([place]);
	}
	return bands;
}

// TRADE-OFF: the grid's widest authored width is the one read and the rest are dropped, because a tree holds one arrangement and the widest is the one that was laid out by hand rather than derived
function rootFromPlaces(layouts, tiles) {
	const places = widestPlaces(layouts);
	if (places.length === 0) return null;
	const seated = new Set(places.map((place) => place.id));
	const rows = bandsOfPlaces(places).map((band) =>
		rowNode(band.map((place) => ({ id: place.id, ratio: place.w, height: pixelHeight(place.h) }))),
	);
	const spare = tiles.filter((tile) => !seated.has(tile.id)).map((tile) => ({ id: tile.id, ratio: 1 }));
	return { dir: ROW, of: [sideBox(null), { dir: COLUMN, of: [...rows, ...spare], keep: true }, sideBox(null)] };
}

function emptyRoot() {
	return { dir: ROW, of: [sideBox(null), { dir: COLUMN, of: [], keep: true }, sideBox(null)] };
}

function normalizeLayout(input, tiles) {
	const given = input?.layout;
	const laidOut = isBox(given) ? normalizeNode(given) : rootFromRegions(given);
	const root = laidOut ?? rootFromPlaces(input?.layouts, tiles) ?? emptyRoot();
	return pruned(root);
}

function serializeNode(node) {
	if (!isBox(node))
		return {
			id: node.id,
			...(node.ratio === 1 ? {} : { ratio: node.ratio }),
			...(node.height ? { height: node.height } : {}),
			...(node.heights ? { heights: node.heights } : {}),
			...slotFlags(node),
		};
	const { dir, of, ...flags } = node;
	return { dir, ...flags, of: of.map(serializeNode) };
}

// TRADE-OFF: a swap box answers to the id of the widget it replaced, because every switcher shipped says `wants: "@default/view-group/holds"` and a box is not a widget to rename
export const VIEW_GROUP = "@default/view-group";
const GROUP_HELD = { was: "views" };

const isStripShown = (tile) => (tile.props?.isTabsShown?.value ?? tile.settings?.isTabsShown) !== false;

function viewsOfGroup(tile, taken, nameOf) {
	return mountRows(mountList(tile, "holds", GROUP_HELD), nameOf).map((row) => {
		const record = tile.mounted[row.name] ?? (row.was ? tile.mounted[row.was] : null) ?? null;
		return {
			name: row.name,
			hidden: row.hidden,
			widget: record?.widget ?? row.widget,
			record,
			id: uniqueName(taken, `${tile.id}:${row.name}`),
		};
	});
}

function nodeOfView(view) {
	const slot = { name: view.name, ...(view.hidden ? { hidden: true } : {}) };
	if (view.widget === "") return { dir: COLUMN, of: [], ...slot };
	return { id: view.id, ratio: 1, ...slot };
}

function tileOfView(view) {
	return {
		id: view.id,
		widget: view.widget,
		settings: view.record?.settings ?? {},
		mounts: view.record?.mounts ?? {},
		props: view.record?.props ?? {},
		slots: view.record?.slots ?? {},
		mounted: view.record?.mounted ?? {},
	};
}

function swapFromGroup(tile, views) {
	return {
		dir: SWAP,
		id: tile.id,
		...(isStripShown(tile) ? {} : { strip: false }),
		of: views.map(nodeOfView),
	};
}

// TRADE-OFF: a group is read into a swap box on every read and never written back as a tile, because a view that holds its own widget's settings inside a mount cannot be carried, resized or bound like the tile it always was
function swapsFromGroups(board, nameOf) {
	const groups = board.tiles.filter(
		(tile) => widgetKeyOf(tile.widget) === VIEW_GROUP && pathOfLeaf(board.layout, tile.id),
	);
	if (groups.length === 0) return board;
	const taken = new Set(board.tiles.map((tile) => tile.id));
	const born = [];
	let layout = board.layout;
	for (const group of groups) {
		const views = viewsOfGroup(group, taken, nameOf);
		layout = replacedAt(layout, pathOfLeaf(layout, group.id), swapFromGroup(group, views));
		born.push(...views.filter((view) => view.widget !== "").map(tileOfView));
	}
	const gone = new Set(groups.map((tile) => tile.id));
	return { tiles: [...board.tiles.filter((tile) => !gone.has(tile.id)), ...born], layout: pruned(layout) };
}

const LEGACY_BARE_ARRAY = 12;

export function normalizeBoard(input, idOf = SAME_ID, nameOf = SAME_ID, roleOf = null) {
	// TRADE-OFF: a bare array is read as tiles AND places at once, which is what the oldest files hold; delegating keeps one promised shape
	if (Array.isArray(input))
		return normalizeBoard({ tiles: input, layouts: { [LEGACY_BARE_ARRAY]: input } }, idOf, nameOf, roleOf);
	const read = (input?.tiles ?? []).map((tile, index) => normalizeTile(tile, index, idOf));
	const { tiles, layout } = swapsFromGroups({ tiles: read, layout: normalizeLayout(input, read) }, nameOf);
	return {
		tiles,
		layout: roleOf ? withDefaultSurfaces({ layout, tiles, roleOf }) : layout,
		// One board, two sizes. The mode is a fact about the board, so it lives in the file:
		// held in a hook it was lost to every re-render the editor caused, which read as
		// "any keystroke collapses the page".
		mode: input?.mode === "expanded" ? "expanded" : "collapsed",
		...(typeof input?.pattern === "string" && input.pattern !== "" ? { pattern: input.pattern } : {}),
	};
}

// CONTEXT: a view never opened has nothing to say, and an empty sub-record in the file reads as one that does
function serializeHeld(held) {
	const slots = serializeHolders(held.slots);
	const mounted = serializeHolders(held.mounted);
	return {
		...(held.widget ? { widget: held.widget } : {}),
		...(held.surface ? { surface: held.surface } : {}),
		...(Object.keys(held.settings ?? {}).length ? { settings: held.settings } : {}),
		...(Object.keys(held.mounts ?? {}).length ? { mounts: held.mounts } : {}),
		...(Object.keys(held.props ?? {}).length ? { props: held.props } : {}),
		...(slots ? { slots } : {}),
		...(mounted ? { mounted } : {}),
	};
}

function serializeHolders(input) {
	const result = {};
	for (const [key, held] of Object.entries(input ?? {})) result[key] = serializeHeld(held);
	return Object.keys(result).length ? result : null;
}

function serializeTile(tile) {
	const slots = serializeHolders(tile.slots);
	const mounted = serializeHolders(tile.mounted);
	return {
		id: tile.id,
		widget: tile.widget,
		...(tile.folded ? { folded: true } : {}),
		...(Object.keys(tile.settings ?? {}).length ? { settings: tile.settings } : {}),
		...(Object.keys(tile.mounts ?? {}).length ? { mounts: tile.mounts } : {}),
		...(Object.keys(tile.props ?? {}).length ? { props: tile.props } : {}),
		...(slots ? { slots } : {}),
		...(mounted ? { mounted } : {}),
	};
}

export function serializeBoard(board) {
	return {
		v: BLOCK_FORMAT,
		tiles: board.tiles.map(serializeTile),
		...(board.mode === "expanded" ? { mode: "expanded" } : {}),
		...(board.pattern ? { pattern: board.pattern } : {}),
		layout: serializeNode(board.layout),
	};
}

export function tileById(board, id) {
	return board.tiles.find((tile) => tile.id === id) ?? null;
}

export function placedIds(board) {
	return new Set(leavesOf(board.layout).map((leaf) => leaf.id));
}
