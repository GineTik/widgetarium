import { useEffect, useRef, useState } from "react";
import { NARROW_PX } from "./cell-sizes";

export function useNarrowShelf() {
	const shelf = useRef<HTMLDivElement>(null);
	const [isNarrow, setNarrow] = useState(false);

	useEffect(() => {
		const node = shelf.current;
		if (!node) return undefined;
		const watcher = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width;
			if (width !== undefined && width > 0) setNarrow(width < NARROW_PX);
		});
		watcher.observe(node);
		return () => watcher.disconnect();
	}, []);

	return { shelf, isNarrow };
}
