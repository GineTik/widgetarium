import type { AnchorBox, FloatingSpot, PanelSpot } from "../constants/popover";

export interface LaidFrame extends PanelSpot {
	readonly scale: number;
}

const VIEWPORT_FRAME: LaidFrame = { left: 0, top: 0, scale: 1 };

export function laidFrameOf(panel: HTMLElement): LaidFrame {
	const laid = panel.getBoundingClientRect();
	if (panel.offsetWidth === 0 || laid.width === 0) return { left: laid.left, top: laid.top, scale: 1 };
	return { left: laid.left, top: laid.top, scale: laid.width / panel.offsetWidth };
}

export function wearAnchorWidth(panel: HTMLElement, anchor: AnchorBox, frame: LaidFrame = VIEWPORT_FRAME): void {
	panel.style.setProperty("--wg-kit-anchor-width", `${anchor.width / frame.scale}px`);
}

export function wearSpot(panel: HTMLElement, spot: FloatingSpot, frame: LaidFrame = VIEWPORT_FRAME): void {
	panel.style.left = `${(spot.left - frame.left) / frame.scale}px`;
	panel.style.top = `${(spot.top - frame.top) / frame.scale}px`;
	panel.style.setProperty("--wg-kit-pop-origin", spot.origin);
	panel.style.setProperty("--wg-kit-pop-available-width", `${Math.round(spot.availableWidth / frame.scale)}px`);
	panel.style.setProperty("--wg-kit-pop-available-height", `${Math.round(spot.availableHeight / frame.scale)}px`);
	panel.dataset["side"] = spot.side;
	panel.dataset["align"] = spot.align;
}
