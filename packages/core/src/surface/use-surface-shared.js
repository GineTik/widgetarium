import { useEffect, useMemo, useRef } from "react";
import { classOf, scaleOf } from "../paths.js";
import { createTileShells } from "../engine/tile-shells.js";
import { createGatewayRefs, createViewCells } from "../gateway/refs.js";
import { refuseFold } from "./refuse-fold.js";
import { MIN_LAID_OUT_BOARD_PX } from "./use-board-width.js";

export function useSurfaceShared({ host, registry, tiles, width }) {
	const refs = useMemo(() => createGatewayRefs(), []);
	const cellFor = useMemo(() => createViewCells(), []);
	const shells = useMemo(() => createTileShells(), []);
	useEffect(() => {
		shells.keepOnly(tiles.map((tile) => tile.id));
	});
	useEffect(() => () => shells.keepOnly([]), [shells]);
	const treeScale = scaleOf(classOf(Math.max(width, MIN_LAID_OUT_BOARD_PX)));
	const foldRef = useRef(null);
	const shared = useMemo(
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
