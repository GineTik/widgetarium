import { columnsOf, keptAt, leavesOf, moveInto, placeInto, REGION_GAP_PX } from "../tree.js";
import type { AskLeaf, BoxNode, PreferredSize } from "../tree-nodes.js";
import type { StandingColumn } from "../tree-columns.js";
import type { EngineManifest } from "../engine/catalogue-index.js";
import { isObject } from "../engine/is-object.js";
import type { InsetsByCell } from "../content-insets.js";
import type { Board, Tile } from "../model.js";
import type { Carry } from "./carry.js";
import type { SurfaceShared } from "./use-surface-shared.js";

interface TreeAsk {
	readonly board: Board;
	readonly width: number;
	readonly shared: Pick<SurfaceShared, "registry">;
}

interface TreeMoment {
	readonly carrying: Carry | null;
	readonly insets: InsetsByCell;
}

type ManifestAt = (id: string | undefined) => EngineManifest | null | undefined;

export interface LaidTree {
	readonly root: BoxNode;
	readonly drawn: BoxNode;
	readonly beside: readonly StandingColumn[];
	readonly floating: readonly number[];
	readonly hidden: readonly number[];
	readonly alone: readonly number[];
	readonly keep: number;
	readonly tileOf: (id: string) => Tile | undefined;
	readonly manifestOf: ManifestAt;
	readonly ask: AskLeaf;
	readonly unplaced: readonly Tile[];
	readonly overlayAt: number | null;
}

interface AskSources {
	readonly widgetOf: (id: string) => string | undefined;
	readonly manifestOf: ManifestAt;
	readonly insets: InsetsByCell;
}

export function layTree({ board, width, shared }: TreeAsk, { carrying, insets }: TreeMoment): LaidTree {
	const root = board.layout;
	const drawn = drawnWhileCarried(root, carrying);
	const { beside, floating, hidden, alone } = columnsOf(drawn, width, REGION_GAP_PX);
	const tileOf = (id: string): Tile | undefined => board.tiles.find((tile) => tile.id === id);
	const widgetOf = (id: string): string | undefined => tileOf(id)?.widget;
	const manifestOf: ManifestAt = (id) => (id === undefined ? undefined : shared.registry.get(widgetOf(id))?.manifest);
	const placed = new Set(leavesOf(root).map((leaf) => leaf.id));
	const keep = keptAt(drawn);
	return {
		root,
		drawn,
		beside,
		floating,
		hidden,
		alone,
		keep,
		tileOf,
		manifestOf,
		ask: askOf({ widgetOf, manifestOf, insets }),
		unplaced: board.tiles.filter((tile) => !placed.has(tile.id)),
		// TRADE-OFF: a root with no `keep` child still stands (columnsOf answers `alone`), so the overlay falls to the first region drawn — unmounted it takes every ref its widgets publish with it
		overlayAt: keep >= 0 ? keep : (alone[0] ?? beside[0]?.at ?? null),
	};
}

function askOf({ widgetOf, manifestOf, insets }: AskSources): AskLeaf {
	return (id) => {
		const manifest = manifestOf(id);
		const stackBelowPx = manifest?.["stackBelowPx"];
		const preferredSize = manifest?.["preferredSize"];
		const role = manifest?.["role"];
		return {
			minPx: typeof stackBelowPx === "number" ? stackBelowPx : 0,
			preferred: isPreferredSize(preferredSize) ? preferredSize : null,
			widget: widgetOf(id),
			role: typeof role === "string" ? role : undefined,
			insets: insets[id],
		};
	};
}

function isPreferredSize(held: unknown): held is PreferredSize {
	if (!isObject(held)) return false;
	const { preferredWidth, preferredHeight, at } = held;
	const isWidth = typeof preferredWidth === "number" || preferredWidth === "full";
	const isHeight = typeof preferredHeight === "number" || preferredHeight === "auto";
	return isWidth && isHeight && (at === undefined || Array.isArray(at));
}

function drawnWhileCarried(root: BoxNode, carrying: Carry | null): BoxNode {
	if (!carrying) return root;
	if (carrying.isIncoming) return placeInto(root, { id: carrying.id, ratio: 1 }, carrying.target);
	return moveInto(root, carrying.id, carrying.target);
}
