import { ALWAYS, COLUMN, DRAWER, ROW } from "./tree.js";
import type { BoardNode, BoxNode, LeafNode } from "./tree.js";
import { isObject } from "./engine/is-object.js";
import { boxFlags, normalizeLeaf, rowNode } from "./board-layout.js";
import type { RawFields } from "./board-layout.js";

export interface GridPlace {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

const LEGACY_CLASS_COLUMNS: ReadonlyMap<string, number> = new Map([
	["phone", 4],
	["tablet", 12],
	["desktop", 20],
]);

const SIDE_FLAGS: RawFields = { collapse: { into: DRAWER, toggle: ALWAYS } };
const KEPT_FLAGS: RawFields = { keep: true };

export function rootFromRegions(given: unknown): BoxNode | null {
	if (!isObject(given)) return null;
	const kept = regionBox(Array.isArray(given) ? given : given["main"], KEPT_FLAGS);
	if (!kept) return null;
	return { dir: ROW, of: [sideBox(given["left"]), kept, sideBox(given["right"])] };
}

// TRADE-OFF: the grid's widest authored width is the one read and the rest are dropped, because a tree holds one arrangement and the widest is the one that was laid out by hand rather than derived
export function rootFromPlaces(layouts: unknown, tiles: readonly { readonly id: string }[]): BoxNode | null {
	const places = widestPlaces(layouts);
	if (places.length === 0) return null;
	const seated = new Set(places.map((place) => place.id));
	const rows = bandsOfPlaces(places).map((band) => rowNode(band.map(leafOfPlace)));
	const spare = tiles.filter((tile) => !seated.has(tile.id)).map((tile): LeafNode => ({ id: tile.id, ratio: 1 }));
	return { dir: ROW, of: [sideBox(null), { dir: COLUMN, of: [...rows, ...spare], keep: true }, sideBox(null)] };
}

export function emptyRoot(): BoxNode {
	return { dir: ROW, of: [sideBox(null), { dir: COLUMN, of: [], keep: true }, sideBox(null)] };
}

function leafOfPlace(place: GridPlace): LeafNode {
	return { id: place.id, ratio: place.w };
}

function nodesFromRows(rows: unknown): BoardNode[] | null {
	if (!Array.isArray(rows)) return null;
	return rows
		.map((row: unknown) =>
			(Array.isArray(row) ? row : [row]).map(normalizeLeaf).filter((leaf): leaf is LeafNode => leaf !== null),
		)
		.filter((cells) => cells.length > 0)
		.map(rowNode);
}

function regionBox(given: unknown, flags: RawFields): BoxNode | null {
	const said: RawFields = isObject(given) && !Array.isArray(given) ? given : {};
	const of = nodesFromRows(Array.isArray(given) ? given : said["rows"]);
	if (!of) return null;
	return { dir: COLUMN, of, ...boxFlags({ ...said, ...flags }) };
}

function sideBox(given: unknown): BoxNode {
	return regionBox(given, SIDE_FLAGS) ?? { dir: COLUMN, of: [], ...boxFlags(SIDE_FLAGS) };
}

function placesOf(value: unknown): GridPlace[] {
	return placesListed(value).flatMap((place: unknown) => {
		const id = isObject(place) ? place["id"] : null;
		if (!isObject(place) || typeof id !== "string" || id === "") return [];
		return [
			{
				id,
				x: Number(place["x"]) || 0,
				y: Number(place["y"]) || 0,
				w: Number(place["w"]) || 3,
				h: Number(place["h"]) || 2,
			},
		];
	});
}

function placesListed(value: unknown): readonly unknown[] {
	if (Array.isArray(value)) return value;
	const places = isObject(value) ? value["places"] : null;
	return Array.isArray(places) ? places : [];
}

function widestPlaces(layouts: unknown): GridPlace[] {
	let widest: number | null = null;
	let places: GridPlace[] = [];
	for (const [key, value] of Object.entries(isObject(layouts) ? layouts : {})) {
		const columns = LEGACY_CLASS_COLUMNS.get(key) ?? Number(key);
		const held = placesOf(value);
		if (!Number.isFinite(columns) || held.length === 0 || (widest !== null && columns <= widest)) continue;
		widest = columns;
		places = held;
	}
	return places;
}

function bandsOfPlaces(places: readonly GridPlace[]): GridPlace[][] {
	const sorted = [...places].sort((one, other) => one.y - other.y || one.x - other.x);
	const bands: GridPlace[][] = [];
	for (const place of sorted) {
		const last = bands[bands.length - 1];
		if (last && last[0]?.y === place.y) last.push(place);
		else bands.push([place]);
	}
	return bands;
}
