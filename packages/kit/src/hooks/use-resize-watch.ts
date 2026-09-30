import { useLayoutEffect } from "react";
import type { RefObject } from "react";

export function useResizeWatch<N extends Element>(ref: RefObject<N | null>, measure: (node: N) => void): void {
	useLayoutEffect(() => {
		const node = ref.current;
		if (!node) return undefined;
		measure(node);
		if (typeof ResizeObserver !== "function") return undefined;
		const watcher = new ResizeObserver(() => measure(node));
		watcher.observe(node);
		return () => watcher.disconnect();
	}, []);
}
