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
import type { InstallingHost } from "./missing-tile.js";
import type { WidgetDefinition } from "./is-drawable.js";
import { refuseFold } from "./refuse-fold.js";
import { MIN_LAID_OUT_BOARD_PX } from "./use-board-width.js";

export interface RegisteredWidget extends WidgetDefinition {
	readonly manifest?: EngineManifest | null;
}

export interface SurfaceRegistry {
	get(id: string | undefined): RegisteredWidget | null | undefined;
}

export type SurfaceHost = MeasureHost & InstallingHost;

export type FoldIntoGroup = () => boolean;

export interface SurfaceShared {
	readonly host: SurfaceHost | null | undefined;
	readonly scale: number;
	readonly refs: GatewayRefs;
	readonly cellFor: (key: string) => ViewCell;
	readonly shells: TileShells;
	readonly registry: SurfaceRegistry;
	readonly onCollapse: () => void;
	readonly onExpand: () => void;
	readonly patchMounted: () => void;
	readonly isMounted: boolean;
	readonly foldIntoGroup: FoldIntoGroup;
}

export interface SurfaceSharedAsk {
	readonly host: SurfaceHost | null | undefined;
	readonly registry: SurfaceRegistry;
	readonly tiles: readonly Tile[];
	readonly width: number;
}

export interface SurfaceSharing {
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
