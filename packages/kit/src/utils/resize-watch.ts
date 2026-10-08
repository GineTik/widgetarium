export type StopWatching = () => void;

export function createResizeObserver(onResize: () => void): ResizeObserver | null {
	return typeof ResizeObserver === "function" ? new ResizeObserver(onResize) : null;
}

export function watchSizes(nodes: readonly Element[], onResize: () => void): StopWatching {
	const watcher = createResizeObserver(onResize);
	for (const node of nodes) watcher?.observe(node);
	return () => watcher?.disconnect();
}

export function watchScrollBox(node: HTMLElement, measure: () => void): StopWatching {
	node.addEventListener("scroll", measure, { passive: true });
	const stopSizes = watchSizes([node, ...Array.from(node.children)], measure);
	return () => {
		node.removeEventListener("scroll", measure);
		stopSizes();
	};
}
