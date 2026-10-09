import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Dispatch, RefCallback, RefObject, SetStateAction } from "react";
import type { SnapLayer } from "../utils/drawer-snaps";

export interface DrawerGeometry extends SnapLayer {
	readonly contentPx: number;
}

export interface MeasuredDrawer {
	readonly geometry: DrawerGeometry;
	readonly panelRef: RefCallback<HTMLDivElement>;
}

interface WatchedPanel {
	readonly node: HTMLDivElement;
	readonly observer: ResizeObserver | null;
}

interface Measuring {
	readonly watched: RefObject<WatchedPanel | null>;
	readonly setGeometry: Dispatch<SetStateAction<DrawerGeometry>>;
}

const UNMEASURED: DrawerGeometry = { layerPx: 0, insetPx: 0, contentPx: 0 };

export function useDrawerGeometry(): MeasuredDrawer {
	const [geometry, setGeometry] = useState(UNMEASURED);
	const watched = useRef<WatchedPanel | null>(null);
	const panelRef = useCallback((node: HTMLDivElement | null) => watchPanel(node, { watched, setGeometry }), []);
	useLayoutEffect(() => remeasure({ watched, setGeometry }));
	useEffect(() => () => watched.current?.observer?.disconnect(), []);
	return { geometry, panelRef };
}

function watchPanel(node: HTMLDivElement | null, measuring: Measuring): void {
	const { watched } = measuring;
	if (!node || watched.current?.node === node) return;
	watched.current?.observer?.disconnect();
	watched.current = { node, observer: sizeObserverOf(node, () => remeasure(measuring)) };
	remeasure(measuring);
}

function remeasure({ watched, setGeometry }: Measuring): void {
	const node = watched.current?.node;
	if (node && !node.isConnected) {
		watched.current?.observer?.disconnect();
		watched.current = null;
	}
	const next = geometryOf(watched.current?.node ?? null);
	setGeometry((was) => (isSameGeometry(was, next) ? was : next));
}

function sizeObserverOf(node: HTMLElement, onResize: () => void): ResizeObserver | null {
	if (typeof ResizeObserver === "undefined") return null;
	const observer = new ResizeObserver(onResize);
	observer.observe(node);
	if (node.parentElement) observer.observe(node.parentElement);
	return observer;
}

function geometryOf(panel: HTMLElement | null): DrawerGeometry {
	if (!panel) return UNMEASURED;
	return {
		layerPx: panel.parentElement?.clientHeight ?? 0,
		insetPx: parseFloat(getComputedStyle(panel).bottom) || 0,
		contentPx: panel.offsetHeight,
	};
}

function isSameGeometry(was: DrawerGeometry, next: DrawerGeometry): boolean {
	return was.layerPx === next.layerPx && was.insetPx === next.insetPx && was.contentPx === next.contentPx;
}
