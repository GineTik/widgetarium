import { useLayoutEffect, useRef } from "react";

export type ScrollEdges = { left: number; right: number; top: number; bottom: number };

export function useScrollFog(
	scrollRef: { current: HTMLElement | null },
	onEdges: (edges: ScrollEdges) => void,
	watched: unknown = null,
): void {
	const latest = useRef(onEdges);
	latest.current = onEdges;

	useLayoutEffect(() => {
		const node = scrollRef.current;
		if (node) latest.current(edgesOf(node));
	});

	useLayoutEffect(() => {
		const node = scrollRef.current;
		if (!node) return undefined;
		const measure = () => latest.current(edgesOf(node));
		node.addEventListener("scroll", measure, { passive: true });
		const watcher = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
		watcher?.observe(node);
		for (const child of Array.from(node.children)) watcher?.observe(child);
		return () => {
			node.removeEventListener("scroll", measure);
			watcher?.disconnect();
		};
	}, [scrollRef, watched]);
}

function edgesOf(node: HTMLElement): ScrollEdges {
	return {
		left: node.scrollLeft,
		right: node.scrollWidth - node.clientWidth - node.scrollLeft,
		top: node.scrollTop,
		bottom: node.scrollHeight - node.clientHeight - node.scrollTop,
	};
}
