import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { FLOAT_EXIT_MS } from "../constants/overlays";
import type { AnchorBox, FloatingSpot, SidePlacement } from "../constants/popover";
import { placeFloating, viewportSize } from "../utils/floating-placement";
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

const CAPTURE_EVERY_SCROLLER = true;

export function useFloatingLayer({ isOpen, anchorBox, placement }: FloatingLayerAsk): FloatingLayer {
	const panelRef = useRef<HTMLDivElement>(null);
	const { isMounted } = usePresence(isOpen, FLOAT_EXIT_MS);
	const place = (): void => placePanel(panelRef.current, anchorBox(), placement);
	const latest = useRef(place);
	latest.current = place;
	useLayoutEffect(() => {
		if (isMounted) place();
	});
	useEffect(() => {
		if (!isOpen) return undefined;
		const follow = (): void => latest.current();
		window.addEventListener("resize", follow);
		window.addEventListener("scroll", follow, CAPTURE_EVERY_SCROLLER);
		return () => {
			window.removeEventListener("resize", follow);
			window.removeEventListener("scroll", follow, CAPTURE_EVERY_SCROLLER);
		};
	}, [isOpen]);
	return { panelRef, isMounted };
}

function placePanel(panel: HTMLElement | null, anchor: AnchorBox | null, placement: SidePlacement): void {
	if (!panel || !anchor) return;
	const size = { width: panel.offsetWidth, height: panel.offsetHeight };
	wearSpot(panel, placeFloating({ ...placement, anchor, panel: size, viewport: viewportSize() }), anchor);
}

function wearSpot(panel: HTMLElement, spot: FloatingSpot, anchor: AnchorBox): void {
	panel.style.left = `${Math.round(spot.left)}px`;
	panel.style.top = `${Math.round(spot.top)}px`;
	panel.style.setProperty("--wg-kit-float-origin", spot.origin);
	panel.style.setProperty("--wg-kit-float-available-width", `${Math.round(spot.availableWidth)}px`);
	panel.style.setProperty("--wg-kit-float-available-height", `${Math.round(spot.availableHeight)}px`);
	panel.style.setProperty("--wg-kit-anchor-width", `${Math.round(anchor.width)}px`);
	panel.dataset["side"] = spot.side;
	panel.dataset["align"] = spot.align;
}
