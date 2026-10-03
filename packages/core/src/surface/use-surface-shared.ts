import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { classOf, scaleOf } from "../paths.js";
import { createTileShells } from "../engine/tile-shells.js";
import type { TileShells } from "../engine/tile-shells.js";
import type { EngineManifest } from "../engine/catalogue-index.js";
import { createGatewayRefs, createViewCells } from "../gateway/refs.js";
import type { GatewayRefs, ViewCell } from "../gateway/refs.js";
import type { MeasureHost } from "../surface-measure.js";
import type { Tile } from "../model.js";
import type { WidgetLookup } from "../registry.js";
import type { HostGatewayHost } from "../engine/host-context.js";
import type { CatalogueHost } from "../catalogue-preview.js";
import type { Here, Navigation } from "../gateway/host.js";
import type { SettingsHost, TilePatch } from "../settings/settings-state.js";
import type { InstallingHost } from "./missing-tile.js";
import type { WidgetDefinition } from "./is-drawable.js";
import { refuseFold } from "./refuse-fold.js";
import { MIN_LAID_OUT_BOARD_PX } from "./use-board-width.js";

interface RegisteredWidget extends WidgetDefinition {
	readonly manifest?: EngineManifest | null;
}

export interface SurfaceRegistry {
	get(id: string | undefined): RegisteredWidget | null | undefined;
}

export interface BoardRegistry extends WidgetLookup {
	resolveId?(id: string): string | null | undefined;
	generationsOf?(key: string): readonly string[];
	tileRefOf(id: string): string;
}

interface HostPlace {
	readonly here?: Here | null | undefined;
	readonly navigator?: Navigation | null | undefined;
}

export type SurfaceHost = MeasureHost & InstallingHost & HostGatewayHost & CatalogueHost & SettingsHost & HostPlace;

export type FoldTile = (tileId: string) => void;

export type PatchMounted = (name: string, was: string | null | undefined, patch: TilePatch) => void;

export type FoldIntoGroup = () => boolean;

export interface SurfaceShared {
	readonly host: SurfaceHost;
	readonly scale: number;
	readonly refs: GatewayRefs;
	readonly cellFor: (key: string) => ViewCell;
	readonly shells: TileShells;
	readonly registry: BoardRegistry;
	readonly onCollapse: FoldTile;
	readonly onExpand: FoldTile;
	readonly patchMounted: PatchMounted;
	readonly isMounted: boolean;
	readonly foldIntoGroup: FoldIntoGroup;
}

interface SurfaceSharedAsk {
	readonly host: SurfaceHost;
	readonly registry: BoardRegistry;
	readonly tiles: readonly Tile[];
	readonly width: number;
}

interface SurfaceSharing {
	readonly refs: GatewayRefs;
	readonly shared: SurfaceShared;
	readonly foldRef: MutableRefObject<FoldIntoGroup | null>;
}

export function useSurfaceShared({ host, registry, tiles, width }: SurfaceSharedAsk): SurfaceSharing {
	const refs = useMemo(() => createGatewayRefs(), []);
	const cellFor = useMemo(() => createViewCells(), []);
	const shells = useMemo(() => createTileShells(), []);
	useEffect(() => {
		shells.keepOnly(tiles.map((tile) => tile.id));
	});
	useEffect(() => () => shells.keepOnly([]), [shells]);
	const treeScale = scaleOf(classOf(Math.max(width, MIN_LAID_OUT_BOARD_PX)));
	const foldRef = useRef<FoldIntoGroup | null>(null);
	const shared = useMemo<SurfaceShared>(
		() => ({
			host,
			scale: treeScale,
			refs,
			cellFor,
			shells,
			registry,
			onCollapse: () => {},
			onExpand: () => {},
			patchMounted: () => {},
			isMounted: false,
			foldIntoGroup: () => foldRef.current?.() ?? refuseFold(),
		}),
		[host, treeScale, refs, cellFor, shells, registry],
	);
	return { refs, shared, foldRef };
}
