import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
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

interface GroupLatest {
	readonly sizes: PanelSizes;
	readonly onLayout: ResizableGroupAsk["onLayout"];
}

interface GroupHeld {
	readonly groupRef: RefObject<HTMLDivElement | null>;
	readonly limits: Map<string, PanelLimits>;
	readonly latest: RefObject<GroupLatest>;
	readonly setSizes: (sizes: PanelSizes) => void;
	readonly setPanelsSeen: Dispatch<SetStateAction<number>>;
	readonly setDragging: (isDragging: boolean) => void;
}

export const PANEL_ID = "data-panel-id";

export function useResizableGroup({ orientation, onLayout }: ResizableGroupAsk): ResizableGroup {
	const groupRef = useRef<HTMLDivElement | null>(null);
	const limits = useRef(new Map<string, PanelLimits>());
	const [sizes, setSizes] = useState<PanelSizes>({});
	const [panelsSeen, setPanelsSeen] = useState(0);
	const [isDragging, setDragging] = useState(false);
	const latest = useRef<GroupLatest>({ sizes, onLayout });
	latest.current = { sizes, onLayout };
	const held: GroupHeld = { groupRef, limits: limits.current, latest, setSizes, setPanelsSeen, setDragging };
	useLayoutEffect(() => layUnsizedPanels(held), [panelsSeen]);
	const group = useMemo(() => groupStateOf(held, orientation), [orientation]);
	return { groupRef, group: { ...group, sizes }, isDragging };
}

function layUnsizedPanels(held: GroupHeld): void {
	const order = panelOrderIn(held.groupRef.current);
	if (order.every((id) => id in held.latest.current.sizes)) return;
	layPanels(held, layPanelSizes(order, held.limits));
}

function layPanels(held: GroupHeld, next: PanelSizes): void {
	held.setSizes(next);
	const order = panelOrderIn(held.groupRef.current);
	held.latest.current.onLayout?.(order.map((id) => next[id] ?? 0));
}

function groupStateOf(held: GroupHeld, orientation: ResizableOrientation): Omit<ResizableState, "sizes"> {
	return {
		orientation,
		limitsOf: (id) => limitsOf(held.limits, id),
		register: (id, panel) => registerPanel(held, id, panel),
		step: (step, from) => layPanels(held, stepPanelSizes(from ?? held.latest.current.sizes, step, held.limits)),
		setDragging: held.setDragging,
	};
}

function registerPanel({ limits, setPanelsSeen }: GroupHeld, id: string, panel: PanelLimits): () => void {
	limits.set(id, panel);
	setPanelsSeen((seen) => seen + 1);
	return () => {
		limits.delete(id);
		setPanelsSeen((seen) => seen + 1);
	};
}

function panelOrderIn(group: Element | null): string[] {
	if (!group) return [];
	return [...group.children].flatMap((child) => child.getAttribute(PANEL_ID) ?? []);
}
