import { isBox, leavesOf, prune } from "./tree.js";
import type { BoardNode, BoxNode } from "./tree.js";
import { BLOCK_FORMAT } from "./version.js";
import { withDefaultSurfaces } from "./surface-default.js";
import type { RoleOf } from "./surface-laws.js";
import { swapsFromGroups } from "./view-groups.js";
import type { NameOf } from "./view-groups.js";
import { isObject } from "./engine/is-object.js";
import { KEEP_ID_WITHOUT_REGISTRY, normalizeTile } from "./board-tiles.js";
import type { HeldRecord, IdOf, SlotRecord, Tile, TileMounts, TileProps, TileSettings } from "./board-tiles.js";
import { isRawBox, normalizeBox, slotFlags } from "./board-layout.js";
import { emptyRoot, rootFromPlaces, rootFromRegions } from "./board-legacy.js";

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
export type {
	HeldRecord,
	IdOf,
	SlotRecord,
	Tile,
	TileMounts,
	TileProp,
	TileProps,
	TileSettings,
} from "./board-tiles.js";
export type { NameOf } from "./view-groups.js";

type BoardMode = "expanded" | "collapsed";

export interface Board {
	readonly tiles: readonly Tile[];
	readonly layout: BoxNode;
	readonly mode: BoardMode;
	readonly base?: string;
}

interface SerializedHeld {
	readonly widget?: string;
	readonly surface?: string;
	readonly settings?: TileSettings;
	readonly mounts?: TileMounts;
	readonly props?: TileProps;
	readonly slots?: Readonly<Record<string, SerializedHeld>>;
	readonly mounted?: Readonly<Record<string, SerializedHeld>>;
}

interface SerializedTile extends SerializedHeld {
	readonly id: string;
	readonly widget: string;
	readonly folded?: true;
}

interface SerializedBoard {
	readonly v: number;
	readonly tiles: readonly SerializedTile[];
	readonly mode?: "expanded";
	readonly base?: string;
	readonly layout: BoardNode;
}

const LEGACY_BARE_ARRAY = 12;

export function normalizeBoard(
	input: unknown,
	idOf: IdOf = KEEP_ID_WITHOUT_REGISTRY,
	nameOf: NameOf = KEEP_ID_WITHOUT_REGISTRY,
	roleOf: RoleOf | null = null,
): Board {
	// TRADE-OFF: a bare array is read as tiles AND places at once, which is what the oldest files hold; delegating keeps one promised shape
	if (Array.isArray(input))
		return normalizeBoard({ tiles: input, layouts: { [LEGACY_BARE_ARRAY]: input } }, idOf, nameOf, roleOf);
	const given = isObject(input) ? input : {};
	const { tiles: rawTiles, base } = given;
	const read = (Array.isArray(rawTiles) ? rawTiles : []).map((tile: unknown, index) =>
		normalizeTile(tile, index, idOf),
	);
	const { tiles, layout } = swapsFromGroups({ tiles: read, layout: normalizeLayout(given, read) }, nameOf);
	return {
		tiles,
		layout: roleOf ? withDefaultSurfaces({ layout, tiles, roleOf }) : layout,
		mode: given["mode"] === "expanded" ? "expanded" : "collapsed",
		...(typeof base === "string" && base !== "" ? { base } : {}),
	};
}

export function serializeBoard(board: Board): SerializedBoard {
	return {
		v: BLOCK_FORMAT,
		tiles: board.tiles.map(serializeTile),
		...(board.mode === "expanded" ? { mode: "expanded" } : {}),
		...(board.base ? { base: board.base } : {}),
		layout: serializeNode(board.layout),
	};
}

export function placedIds(board: Pick<Board, "layout">): Set<string> {
	return new Set(leavesOf(board.layout).map((leaf) => leaf.id));
}

function normalizeLayout(input: Readonly<Record<string, unknown>>, tiles: readonly Tile[]): BoxNode {
	const given = input["layout"];
	const laidOut = isRawBox(given) ? normalizeBox(given) : rootFromRegions(given);
	const root = laidOut ?? rootFromPlaces(input["layouts"], tiles) ?? emptyRoot();
	return prune(root);
}

function serializeNode(node: BoardNode): BoardNode {
	if (!isBox(node))
		return {
			id: node.id,
			...(node.ratio === 1 ? {} : { ratio: node.ratio }),
			...slotFlags(node),
		};
	const { dir, of, ...flags } = node;
	return { dir, ...flags, of: of.map(serializeNode) };
}

function serializeHeld(held: SlotRecord): SerializedHeld {
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

function serializeHolders(
	input: Readonly<Record<string, SlotRecord | HeldRecord>> | undefined,
): Record<string, SerializedHeld> | null {
	const result = Object.fromEntries(
		Object.entries(input ?? {}).map(([key, held]) => [key, serializeHeld(held)] as const),
	);
	return Object.keys(result).length ? result : null;
}

function serializeTile(tile: Tile): SerializedTile {
	const slots = serializeHolders(tile.slots);
	const mounted = serializeHolders(tile.mounted);
	return {
		id: tile.id,
		widget: tile.widget,
		...(tile.folded ? { folded: true } : {}),
		...(Object.keys(tile.settings).length ? { settings: tile.settings } : {}),
		...(Object.keys(tile.mounts).length ? { mounts: tile.mounts } : {}),
		...(Object.keys(tile.props).length ? { props: tile.props } : {}),
		...(slots ? { slots } : {}),
		...(mounted ? { mounted } : {}),
	};
}
