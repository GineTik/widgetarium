import { useLayoutEffect, useRef } from "react";

const TIP_WIDE_BY = "--mt3-tip-wide-by";
const TIP_TALL_BY = "--mt3-tip-tall-by";

export function useWritesOwnSize() {
	const held = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		const node = held.current;
		if (!node) return;
		const room = node.getBoundingClientRect();
		node.style.setProperty(TIP_WIDE_BY, `${room.width}px`);
		node.style.setProperty(TIP_TALL_BY, `${room.height}px`);
	});

	return held;
}
