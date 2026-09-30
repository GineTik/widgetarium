import { useState } from "react";
import type { RefObject } from "react";
import { useResizeWatch } from "./use-resize-watch";

export function useWidthOf(ref: RefObject<Element | null>): number {
	const [width, setWidth] = useState(0);
	useResizeWatch(ref, (node) => setWidth(node.clientWidth));
	return width;
}
