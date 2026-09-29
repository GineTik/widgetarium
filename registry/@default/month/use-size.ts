import { useEffect, useState } from "react";
import type { Size } from "./types";

export function useSize(node: { current: HTMLElement | null }, fallback: Size) {
	const [box, setBox] = useState(fallback);
	useEffect(() => {
		const held = node.current;
		if (!held || typeof ResizeObserver !== "function") return undefined;
		const watcher = new ResizeObserver(([entry]) => {
			if (entry) setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
		});
		watcher.observe(held);
		return () => watcher.disconnect();
	}, []);
	return box;
}
