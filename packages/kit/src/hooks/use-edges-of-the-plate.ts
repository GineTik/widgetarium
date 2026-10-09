import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { plateEdgesTakenBy, plateUnder, ROWS_SHARE_THE_PLATE, ROWS_TAKE_THE_PLATE_EDGE } from "../utils/plate-edges";

export function useEdgesOfThePlate(node: RefObject<Element | null>, isOnPlate: boolean): void {
	useLayoutEffect(() => {
		const rows = node.current;
		if (!isOnPlate || !rows || !plateUnder(rows)) return undefined;
		const taken = plateEdgesTakenBy(rows);
		if (!taken) return marked(rows, ROWS_SHARE_THE_PLATE, "");
		return marked(taken.plate, ROWS_TAKE_THE_PLATE_EDGE, taken.edges);
	});
}

function marked(node: Element, attribute: string, value: string): () => void {
	node.setAttribute(attribute, value);
	return () => node.removeAttribute(attribute);
}
