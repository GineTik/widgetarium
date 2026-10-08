import type { AnchorBox, FloatingSpot, PanelSpot } from "../constants/popover";

const VIEWPORT_ORIGIN: PanelSpot = { left: 0, top: 0 };

export function wearAnchorWidth(panel: HTMLElement, anchor: AnchorBox): void {
	panel.style.setProperty("--wg-kit-anchor-width", `${anchor.width}px`);
}

export function wearSpot(panel: HTMLElement, spot: FloatingSpot, laidAt: PanelSpot = VIEWPORT_ORIGIN): void {
	panel.style.left = `${spot.left - laidAt.left}px`;
	panel.style.top = `${spot.top - laidAt.top}px`;
	panel.style.setProperty("--wg-kit-pop-origin", spot.origin);
	panel.style.setProperty("--wg-kit-pop-available-width", `${Math.round(spot.availableWidth)}px`);
	panel.style.setProperty("--wg-kit-pop-available-height", `${Math.round(spot.availableHeight)}px`);
	panel.dataset["side"] = spot.side;
	panel.dataset["align"] = spot.align;
}
