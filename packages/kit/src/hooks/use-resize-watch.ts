import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { watchSizes } from "../utils/resize-watch";

export function useResizeWatch<N extends Element>(ref: RefObject<N | null>, measure: (node: N) => void): void {
	useLayoutEffect(() => {
		const node = ref.current;
		if (!node) return undefined;
		measure(node);
		return watchSizes([node], () => measure(node));
	}, []);
}
