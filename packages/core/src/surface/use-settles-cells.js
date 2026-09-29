import { useLayoutEffect, useRef } from "react";
import { movesFrom, playMoves, positionsWithin } from "../flip.js";

// TRADE-OFF: a gap that moved because a widget's content was measured snaps into place, because motion answers a press and nobody pressed anything
export function useSettlesCells(rootRef, insets) {
	const restingRef = useRef({});
	const measuredRef = useRef(insets);
	useLayoutEffect(() => {
		const now = positionsWithin(rootRef.current, ".wg-tree-cell", (node) => node.dataset.cell);
		const moves = measuredRef.current === insets ? movesFrom(restingRef.current, now) : {};
		restingRef.current = now;
		measuredRef.current = insets;
		playMoves(rootRef.current, moves, (root, id) => root.querySelector(`.wg-tree-cell[data-cell="${id}"]`));
	});
}
