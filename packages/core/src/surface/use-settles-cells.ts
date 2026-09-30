import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { movesFrom, playMoves, positionsWithin } from "../flip.js";
import type { Places } from "../flip.js";
import type { InsetsByCell } from "../content-insets.js";

// TRADE-OFF: a gap that moved because a widget's content was measured snaps into place, because motion answers a press and nobody pressed anything
export function useSettlesCells(rootRef: RefObject<HTMLElement | null>, insets: InsetsByCell): void {
	const restingRef = useRef<Places>({});
	const measuredRef = useRef(insets);
	useLayoutEffect(() => {
		const now = positionsWithin<HTMLElement>(rootRef.current, ".wg-tree-cell", (node) => node.dataset["cell"] ?? "");
		const moves = measuredRef.current === insets ? movesFrom(restingRef.current, now) : {};
		restingRef.current = now;
		measuredRef.current = insets;
		playMoves(rootRef.current, moves, (root, id) =>
			root?.querySelector<HTMLElement>(`.wg-tree-cell[data-cell="${id}"]`),
		);
	});
}
