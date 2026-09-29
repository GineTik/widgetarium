import { useEffect, useState } from "react";

export function useWidth(node: { current: HTMLElement | null }, fallback: number) {
	const [width, setWidth] = useState(fallback);
	useEffect(() => {
		const held = node.current;
		if (!held || typeof ResizeObserver !== "function") return undefined;
		const watcher = new ResizeObserver(([entry]) => {
			if (entry) setWidth(entry.contentRect.width);
		});
		watcher.observe(held);
		return () => watcher.disconnect();
	}, []);
	return width;
}
