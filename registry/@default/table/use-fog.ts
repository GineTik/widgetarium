import { useEffect, useRef, useState } from "react";

type Fog = { left: boolean; right: boolean; top: boolean; bottom: boolean };

const EDGE_SLACK_PX = 1;

export function useFog(isFaded: boolean, signature: string) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [fog, setFog] = useState<Fog>({ left: false, right: false, top: false, bottom: false });

	useEffect(() => {
		const node = scrollRef.current;
		if (node === null || !isFaded) return undefined;
		const measure = () => setFog(fogOf(node));
		measure();
		node.addEventListener("scroll", measure, { passive: true });
		const watch = new ResizeObserver(measure);
		watch.observe(node);
		for (const child of Array.from(node.children)) watch.observe(child);
		return () => {
			node.removeEventListener("scroll", measure);
			watch.disconnect();
		};
	}, [isFaded, signature]);

	return { scrollRef, fog };
}

function fogOf(node: HTMLElement): Fog {
	return {
		left: node.scrollLeft > EDGE_SLACK_PX,
		right: node.scrollLeft + node.clientWidth < node.scrollWidth - EDGE_SLACK_PX,
		top: node.scrollTop > EDGE_SLACK_PX,
		bottom: node.scrollTop + node.clientHeight < node.scrollHeight - EDGE_SLACK_PX,
	};
}
