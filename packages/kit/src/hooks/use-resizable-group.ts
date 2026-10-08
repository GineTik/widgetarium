import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ResizableOrientation, ResizableState } from "../components/resizable-context";
import { limitsOf, layPanelSizes, stepPanelSizes } from "../utils/resizable";
import type { PanelLimits, PanelSizes } from "../utils/resizable";

export interface ResizableGroupAsk {
	readonly orientation: ResizableOrientation;
	readonly onLayout: ((sizes: number[]) => void) | undefined;
}

export interface ResizableGroup {
	readonly groupRef: RefObject<HTMLDivElement | null>;
	readonly group: ResizableState;
	readonly isDragging: boolean;
}

export const PANEL_ID = "data-panel-id";

export function useResizableGroup({ orientation, onLayout }: ResizableGroupAsk): ResizableGroup {
	const groupRef = useRef<HTMLDivElement | null>(null);
	const limits = useRef(new Map<string, PanelLimits>());
	const [sizes, setSizes] = useState<PanelSizes>({});
	const [panelsSeen, setPanelsSeen] = useState(0);
	const [isDragging, setDragging] = useState(false);
	const latest = useRef({ sizes, onLayout });
	latest.current = { sizes, onLayout };
	const lay = (next: PanelSizes): void => {
		setSizes(next);
		const order = panelOrderIn(groupRef.current);
		latest.current.onLayout?.(order.map((id) => next[id] ?? 0));
	};
	useLayoutEffect(() => {
		const order = panelOrderIn(groupRef.current);
		if (order.every((id) => id in latest.current.sizes)) return;
		lay(layPanelSizes(order, limits.current));
	}, [panelsSeen]);
	const group = useMemo<Omit<ResizableState, "sizes">>(
		() => ({
			orientation,
			limitsOf: (id) => limitsOf(limits.current, id),
			register: (id, panel) => {
				limits.current.set(id, panel);
				setPanelsSeen((seen) => seen + 1);
				return () => {
					limits.current.delete(id);
					setPanelsSeen((seen) => seen + 1);
				};
			},
			step: (step, from) => lay(stepPanelSizes(from ?? latest.current.sizes, step, limits.current)),
			setDragging,
		}),
		[orientation],
	);
	return { groupRef, group: { ...group, sizes }, isDragging };
}

function panelOrderIn(group: Element | null): string[] {
	if (!group) return [];
	return [...group.children].flatMap((child) => child.getAttribute(PANEL_ID) ?? []);
}
