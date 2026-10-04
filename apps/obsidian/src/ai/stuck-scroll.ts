import { createElement as h, useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import { Icon, IconButton } from "@widgetarium/kit";

const STUCK_WITHIN_PX = 32;
const TO_END = "Scroll to the latest message";

export interface StuckScroll {
	readonly scroller: RefObject<HTMLDivElement | null>;
	readonly isStuck: boolean;
	readonly onScroll: () => void;
	readonly toEnd: () => void;
}

export function useStuckToEnd(changed: readonly unknown[]): StuckScroll {
	const scroller = useRef<HTMLDivElement>(null);
	const stuck = useRef(true);
	const [isStuck, setIsStuck] = useState(true);
	const onScroll = useCallback((): void => {
		const node = scroller.current;
		if (!node) return;
		stuck.current = isAtEnd(node);
		setIsStuck(stuck.current);
	}, []);
	const toEnd = useCallback((): void => {
		const node = scroller.current;
		if (!node) return;
		stuck.current = true;
		setIsStuck(true);
		node.scrollTop = node.scrollHeight;
	}, []);
	useEffect(() => {
		const node = scroller.current;
		if (node && stuck.current) node.scrollTop = node.scrollHeight;
	}, changed);
	return { scroller, isStuck, onScroll, toEnd };
}

export function ToEndButton({ toEnd }: { readonly toEnd: () => void }): ReactElement {
	return h(
		"div",
		{ className: "wg-ai-to-end" },
		h(
			IconButton,
			{ variant: "neutral", size: "s", "aria-label": TO_END, title: TO_END, onClick: toEnd },
			h(Icon, { name: "arrow-down" }),
		),
	);
}

function isAtEnd(node: HTMLElement): boolean {
	return node.scrollHeight - node.scrollTop - node.clientHeight <= STUCK_WITHIN_PX;
}
