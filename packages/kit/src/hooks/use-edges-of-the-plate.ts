import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { plateEdgesTakenBy } from "../utils/plate-edges";

const ROWS_TAKE_THE_PLATE_EDGE = "data-rows-flush";

export function useEdgesOfThePlate(node: RefObject<Element | null>, isOnPlate: boolean): void {
	useLayoutEffect(() => {
		if (!isOnPlate || !node.current) return undefined;
		const taken = plateEdgesTakenBy(node.current);
		if (!taken) return undefined;
		taken.plate.setAttribute(ROWS_TAKE_THE_PLATE_EDGE, taken.edges);
		return () => taken.plate.removeAttribute(ROWS_TAKE_THE_PLATE_EDGE);
	});
}
