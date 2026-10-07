import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { portalLayer } from "../utils/portal-layer";

export const OVERLAY_LAYER_ATTRIBUTE = "data-wg-overlay-layer";
export const OVERLAY_ROOT_ATTRIBUTE = "data-wg-overlay-root";

export interface OverlayLayer {
	readonly anchorRef: RefObject<HTMLSpanElement | null>;
	readonly layer: HTMLElement | null;
	readonly isScoped: boolean;
}

export function useOverlayLayer(isOpen: boolean): OverlayLayer {
	const anchorRef = useRef<HTMLSpanElement | null>(null);
	const [scoped, setScoped] = useState<HTMLElement | null | undefined>(undefined);
	useLayoutEffect(() => {
		if (!isOpen) return;
		setScoped(outermostLayerOf(anchorRef.current));
	}, [isOpen]);
	if (scoped === undefined) return { anchorRef, layer: null, isScoped: false };
	return { anchorRef, layer: scoped ?? portalLayer(), isScoped: scoped !== null };
}

function outermostLayerOf(anchor: HTMLElement | null): HTMLElement | null {
	const root = anchor?.closest<HTMLElement>(`[${OVERLAY_ROOT_ATTRIBUTE}]`) ?? null;
	let outermost: HTMLElement | null = null;
	for (let at = anchor?.parentElement ?? null; at !== null; at = at.parentElement) {
		if (at.hasAttribute(OVERLAY_LAYER_ATTRIBUTE) || at === root) outermost = at;
		if (at === root) return outermost;
	}
	return outermost;
}
