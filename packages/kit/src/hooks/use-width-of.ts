import { useState } from "react";
import { useResizeWatch } from "./use-resize-watch";

export function useWidthOf(ref) {
	const [width, setWidth] = useState(0);
	useResizeWatch(ref, (node) => setWidth(node.clientWidth));
	return width;
}
