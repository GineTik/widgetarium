import { useLayoutEffect, useRef } from "react";
import { watchScrollBox } from "../utils/resize-watch";

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
		return watchScrollBox(node, () => latest.current(edgesOf(node)));
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
