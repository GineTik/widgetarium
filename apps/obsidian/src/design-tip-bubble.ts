import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";

export interface Placed {
	readonly left: number;
	readonly top: number;
}

const WINDOW_EDGE_PX = 8;

export function TipBubble({ label, placed }: { readonly label: string; readonly placed: Placed }): ReactElement {
	const bubble = useRef<HTMLDivElement | null>(null);
	const [left, setLeft] = useState(placed.left);
	return h(
		"div",
		{
			className: "wg-portal wg-design-tip-bubble",
			ref: (node: HTMLDivElement | null) => {
				if (!node || bubble.current === node) return;
				bubble.current = node;
				const half = node.offsetWidth / 2;
				setLeft(Math.min(window.innerWidth - WINDOW_EDGE_PX - half, Math.max(WINDOW_EDGE_PX + half, placed.left)));
			},
			style: { left, top: placed.top },
		},
		label,
	);
}
