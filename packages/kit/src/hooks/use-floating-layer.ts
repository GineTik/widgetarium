import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { FLOAT_EXIT_MS } from "../constants/overlays";
import type { AnchorBox, SidePlacement } from "../constants/popover";
import { placeFloating, viewportSize } from "../utils/floating-placement";
import { wearAnchorWidth, wearSpot } from "../utils/wear-spot";
import { useFollowsViewport } from "./use-follows-viewport";
import { usePresence } from "./use-presence";

export interface FloatingLayerAsk {
	readonly isOpen: boolean;
	readonly anchorBox: () => AnchorBox | null;
	readonly placement: SidePlacement;
}

export interface FloatingLayer {
	readonly panelRef: RefObject<HTMLDivElement | null>;
	readonly isMounted: boolean;
}

export function useFloatingLayer({ isOpen, anchorBox, placement }: FloatingLayerAsk): FloatingLayer {
	const panelRef = useRef<HTMLDivElement>(null);
	const { isMounted } = usePresence(isOpen, FLOAT_EXIT_MS);
	const place = (): void => placeFloatingPanel(panelRef.current, anchorBox(), placement);
	useLayoutEffect(() => {
		if (isMounted) place();
	});
	useFollowsViewport(isOpen, place);
	return { panelRef, isMounted };
}

function placeFloatingPanel(panel: HTMLElement | null, anchor: AnchorBox | null, placement: SidePlacement): void {
	if (!panel || !anchor) return;
	wearAnchorWidth(panel, anchor);
	const size = { width: panel.offsetWidth, height: panel.offsetHeight };
	wearSpot(panel, placeFloating({ ...placement, anchor, panel: size, viewport: viewportSize() }));
}
