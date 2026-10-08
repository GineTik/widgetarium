export interface PanelSpot {
	readonly left: number;
	readonly top: number;
}

export interface PanelSize {
	readonly width: number;
	readonly height: number;
}

export interface Placement {
	readonly panelClass: string;
	readonly hidesTrigger: boolean;
	readonly measuresTrigger: boolean;
	readonly solve: (anchor: AnchorBox, panel: PanelSize, viewport: PanelSize) => FloatingSpot;
	readonly key: string;
}

export interface AnchorBox {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly width: number;
	readonly height: number;
}

export type SpotSide = PopoverSide | PlacementName;

export interface FloatingSpot extends PanelSpot {
	readonly side: SpotSide;
	readonly align: PopoverAlign;
	readonly origin: string;
	readonly availableWidth: number;
	readonly availableHeight: number;
}

export interface SidePlacement {
	readonly side: PopoverSide;
	readonly align: PopoverAlign;
	readonly sideOffset: number;
	readonly alignOffset: number;
}

export type PlacementChoice = PlacementName | SidePlacement;

export type PlacementName = "over" | "below";

export const PRESS_EVENTS: readonly ("pointerdown" | "mousedown")[] = ["pointerdown", "mousedown"];

export const CAPTURE_PAST_THE_EDITOR_SHIELD = true;

export const POPOVER_ITEM = ".wg-kit-pop-item:not([disabled])";

export const EXIT_GUARD_MS = 400;

export const GROW_MS = 420;

export const CONTENT_MS = 240;

export const CONTENT_DELAY_MS = 80;

export const LAND_MARGIN_MS = 40;

export const ANCHOR_GAP_PX = 6;

export type PopoverSide = "top" | "right" | "bottom" | "left";

export type PopoverAlign = "start" | "center" | "end";

export const DEFAULT_SIDE_OFFSET = 4;

export const SCREEN_MARGIN_PX = 8;
