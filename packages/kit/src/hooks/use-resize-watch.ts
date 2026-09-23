import { useLayoutEffect } from "react";

export function useResizeWatch(ref, measure) {
	useLayoutEffect(() => {
		const node = ref.current;
		if (!node) return;
		measure(node);
		if (typeof ResizeObserver !== "function") return;
		const watcher = new ResizeObserver(() => measure(node));
		watcher.observe(node);
		return () => watcher.disconnect();
	}, []);
}
