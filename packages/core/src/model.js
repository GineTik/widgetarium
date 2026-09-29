import {
	ADAPTIVE,
	ALWAYS,
	COLLAPSES,
	DRAWER,
	TOGGLES,
	COLUMN,
	APART,
	isBox,
	leavesOf,
	prune,
	ROW,
	SIDES,
	SURFACES,
	SURFACE_WAS,
	SWAP,
} from "./tree.js";
import { BLOCK_FORMAT } from "./version.js";
import { isKnownRole, readSlotSurface } from "./surface-roles.js";
import { withDefaultSurfaces } from "./surface-default.js";
import { heldLook } from "./held-records.js";
import { swapsFromGroups } from "./view-groups.js";

export {
	heldKey,
	heldTile,
	keepNamedRecords,
	keysStillNamed,
	mountKeys,
	mountList,
	mountPatch,
	mountRows,
	mountRowToStore,
	propConfig,
	rekey,
	uniqueName,
	withoutKey,
} from "./held-records.js";
export { VIEW_GROUP } from "./view-groups.js";

const LEGACY_CLASS_COLUMNS = { phone: 4, tablet: 12, desktop: 20 };

const DIRECTIONS = new Set([ROW, COLUMN, SWAP]);

const SIDE_FLAGS = { collapse: { into: DRAWER, toggle: ALWAYS } };
const KEPT_FLAGS = { keep: true };

const LEGACY_BARE_ARRAY = 12;

export function normalizeBoard(
	input,
	idOf = KEEP_ID_WITHOUT_REGISTRY,
	nameOf = KEEP_ID_WITHOUT_REGISTRY,
	roleOf = null,
) {
	// TRADE-OFF: a bare array is read as tiles AND places at once, which is what the oldest files hold; delegating keeps one promised shape
	if (Array.isArray(input))
		return normalizeBoard({ tiles: input, layouts: { [LEGACY_BARE_ARRAY]: input } }, idOf, nameOf, roleOf);
	const read = (input?.tiles ?? []).map((tile, index) => normalizeTile(tile, index, idOf));
	const { tiles, layout } = swapsFromGroups({ tiles: read, layout: normalizeLayout(input, read) }, nameOf);
	return {
		tiles,
		layout: roleOf ? withDefaultSurfaces({ layout, tiles, roleOf }) : layout,
		mode: input?.mode === "expanded" ? "expanded" : "collapsed",
		...(typeof input?.base === "string" && input.base !== "" ? { base: input.base } : {}),
	};
}

export function serializeBoard(board) {
	return {
		v: BLOCK_FORMAT,
		tiles: board.tiles.map(serializeTile),
		...(board.mode === "expanded" ? { mode: "expanded" } : {}),
		...(board.base ? { base: board.base } : {}),
		layout: serializeNode(board.layout),
	};
}

export function tileById(board, id) {
	return board.tiles.find((tile) => tile.id === id) ?? null;
}

export function placedIds(board) {
	return new Set(leavesOf(board.layout).map((leaf) => leaf.id));
}

const KEEP_ID_WITHOUT_REGISTRY = (id) => id;

function widgetOfSlotOrMount(input, keyWidget) {
	if (typeof input === "string") return input === "" ? null : input;
	if (typeof input?.widget === "string" && input.widget !== "") return input.widget;
	return keyWidget;
}

function normalizeHeld(input, keyWidget, idOf) {
	const widget = widgetOfSlotOrMount(input, keyWidget);
	if (typeof widget !== "string" || widget === "") return null;
	const held = typeof input === "object" && input !== null ? input : {};
	return {
		widget: idOf(widget),
		settings: held.settings ?? {},
		mounts: held.mounts ?? {},
		props: held.props ?? {},
		slots: normalizeSlots(held.slots, idOf),
		mounted: normalizeMounted(held.mounted, idOf),
		...heldLook(held),
	};
}

function normalizeMounted(input, idOf = KEEP_ID_WITHOUT_REGISTRY) {
	if (typeof input !== "object" || input === null) return {};
	const result = {};
	for (const [key, held] of Object.entries(input)) {
		const record = normalizeHeld(held, key.split("#")[0], idOf);
		if (record) result[key] = record;
	}
	return result;
}

const isHeldProps = (props) => typeof props === "object" && props !== null && Object.keys(props).length > 0;

function normalizeSlots(input, idOf = KEEP_ID_WITHOUT_REGISTRY) {
	if (typeof input !== "object" || input === null) return {};
	const result = {};
	for (const [name, held] of Object.entries(input)) {
		const record = normalizeHeld(held, null, idOf);
		const said = readSlotSurface(held?.surface);
		const worn = said ? { surface: said } : null;
		const set = isHeldProps(held?.props) ? { props: held.props } : null;
		if (record || worn || set) result[name] = { ...set, ...record, ...worn };
	}
	return result;
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
	return { id, ratio: ratio ?? 1, ...slotFlags(input) };
}

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
	return { dir: DIRECTIONS.has(input.dir) ? input.dir : COLUMN, of, ...boxFlags(input) };
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
	const rows = bandsOfPlaces(places).map((band) => rowNode(band.map((place) => ({ id: place.id, ratio: place.w }))));
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
	return prune(root);
}

function serializeNode(node) {
	if (!isBox(node))
		return {
			id: node.id,
			...(node.ratio === 1 ? {} : { ratio: node.ratio }),
			...slotFlags(node),
		};
	const { dir, of, ...flags } = node;
	return { dir, ...flags, of: of.map(serializeNode) };
}

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
