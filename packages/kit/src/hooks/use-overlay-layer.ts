import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { portalLayer } from "../utils/portal-layer";

export const OVERLAY_LAYER_ATTRIBUTE = "data-wg-overlay-layer";

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
		setScoped(anchorRef.current?.closest<HTMLElement>(`[${OVERLAY_LAYER_ATTRIBUTE}]`) ?? null);
	}, [isOpen]);
	if (scoped === undefined) return { anchorRef, layer: null, isScoped: false };
	return { anchorRef, layer: scoped ?? portalLayer(), isScoped: scoped !== null };
}
