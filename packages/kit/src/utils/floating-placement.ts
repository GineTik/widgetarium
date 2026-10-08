import type { RefObject } from "react";
import { ANCHOR_GAP_PX, SCREEN_MARGIN_PX } from "../constants/popover";
import type {
	AnchorBox,
	FloatingSpot,
	PanelSize,
	PanelSpot,
	Placement,
	PlacementChoice,
	PlacementName,
	PopoverAlign,
	PopoverSide,
	SidePlacement,
} from "../constants/popover";

export interface FloatingAsk extends SidePlacement {
	readonly anchor: AnchorBox;
	readonly panel: PanelSize;
	readonly viewport: PanelSize;
}

interface NamedSpots {
	readonly wanted: (anchor: AnchorBox) => PanelSpot;
	readonly away: (anchor: AnchorBox, panel: PanelSize) => PanelSpot;
}

const NAMED_SPOTS: Readonly<Record<PlacementName, NamedSpots>> = {
	over: {
		wanted: (anchor) => ({ left: anchor.left, top: anchor.top }),
		away: (anchor, panel) => ({ left: anchor.right - panel.width, top: anchor.bottom - panel.height }),
	},
	below: {
		wanted: (anchor) => ({ left: anchor.left, top: anchor.bottom + ANCHOR_GAP_PX }),
		away: (anchor, panel) => ({ left: anchor.right - panel.width, top: anchor.top - ANCHOR_GAP_PX - panel.height }),
	},
};

const NAMED_PLACEMENTS: Readonly<Record<PlacementName, Placement>> = {
	over: {
		panelClass: "",
		hidesTrigger: true,
		measuresTrigger: false,
		key: "over",
		solve: (anchor, panel, viewport) => placeByName("over", anchor, panel, viewport),
	},
	below: {
		panelClass: "is-below",
		hidesTrigger: false,
		measuresTrigger: false,
		key: "below",
		solve: (anchor, panel, viewport) => placeByName("below", anchor, panel, viewport),
	},
};

const OPPOSITE: Readonly<Record<PopoverSide, PopoverSide>> = {
	top: "bottom",
	bottom: "top",
	left: "right",
	right: "left",
};

export function placeFloating(ask: FloatingAsk): FloatingSpot {
	const side = sideWithRoom(ask);
	const across = shiftedIntoView(ask, side, crossStart(ask, side));
	const along = mainStart(ask, side);
	const spot = isVertical(side) ? { left: across, top: along } : { left: along, top: across };
	return {
		...spot,
		side,
		align: ask.align,
		origin: originFacing(ask, side, spot),
		availableWidth: isVertical(side) ? ask.viewport.width - 2 * SCREEN_MARGIN_PX : roomOn(ask, side),
		availableHeight: isVertical(side) ? roomOn(ask, side) : ask.viewport.height - 2 * SCREEN_MARGIN_PX,
	};
}

export function placementOf(choice: PlacementChoice): Placement {
	if (typeof choice === "string") return NAMED_PLACEMENTS[choice];
	return {
		panelClass: "is-sided",
		hidesTrigger: false,
		measuresTrigger: true,
		key: `${choice.side}/${choice.align}/${choice.sideOffset}/${choice.alignOffset}`,
		solve: (anchor, panel, viewport) => placeFloating({ ...choice, anchor, panel, viewport }),
	};
}

export function boxOf(ref: RefObject<Element | null>): () => AnchorBox | null {
	return () => ref.current?.getBoundingClientRect() ?? null;
}

export function viewportSize(): PanelSize {
	return { width: window.innerWidth, height: window.innerHeight };
}

export function isVertical(side: PopoverSide): boolean {
	return side === "top" || side === "bottom";
}

function sideWithRoom(ask: FloatingAsk): PopoverSide {
	const need = isVertical(ask.side) ? ask.panel.height : ask.panel.width;
	if (roomOn(ask, ask.side) >= need) return ask.side;
	const opposite = OPPOSITE[ask.side];
	return roomOn(ask, opposite) > roomOn(ask, ask.side) ? opposite : ask.side;
}

function roomOn(ask: FloatingAsk, side: PopoverSide): number {
	const { anchor, viewport, sideOffset } = ask;
	const gap = sideOffset + SCREEN_MARGIN_PX;
	if (side === "bottom") return viewport.height - anchor.bottom - gap;
	if (side === "top") return anchor.top - gap;
	if (side === "right") return viewport.width - anchor.right - gap;
	return anchor.left - gap;
}

function mainStart({ anchor, panel, sideOffset }: FloatingAsk, side: PopoverSide): number {
	if (side === "bottom") return anchor.bottom + sideOffset;
	if (side === "top") return anchor.top - sideOffset - panel.height;
	if (side === "right") return anchor.right + sideOffset;
	return anchor.left - sideOffset - panel.width;
}

function crossStart({ anchor, panel, align, alignOffset }: FloatingAsk, side: PopoverSide): number {
	const start = isVertical(side) ? anchor.left : anchor.top;
	const length = isVertical(side) ? anchor.width : anchor.height;
	const size = isVertical(side) ? panel.width : panel.height;
	return alignedStart({ start, length, size, align, alignOffset });
}

interface Aligned {
	readonly start: number;
	readonly length: number;
	readonly size: number;
	readonly align: PopoverAlign;
	readonly alignOffset: number;
}

function alignedStart({ start, length, size, align, alignOffset }: Aligned): number {
	if (align === "start") return start + alignOffset;
	if (align === "end") return start + length - size - alignOffset;
	return start + (length - size) / 2;
}

function shiftedIntoView({ panel, viewport }: FloatingAsk, side: PopoverSide, wanted: number): number {
	const size = isVertical(side) ? panel.width : panel.height;
	const room = isVertical(side) ? viewport.width : viewport.height;
	const last = room - SCREEN_MARGIN_PX - size;
	return Math.max(SCREEN_MARGIN_PX, Math.min(last, wanted));
}

function originFacing({ anchor, panel }: FloatingAsk, side: PopoverSide, spot: { left: number; top: number }): string {
	if (isVertical(side)) {
		const x = clamp(anchor.left + anchor.width / 2 - spot.left, panel.width);
		return `${Math.round(x)}px ${OPPOSITE[side]}`;
	}
	const y = clamp(anchor.top + anchor.height / 2 - spot.top, panel.height);
	return `${OPPOSITE[side]} ${Math.round(y)}px`;
}

function clamp(value: number, ceiling: number): number {
	return Math.max(0, Math.min(ceiling, value));
}

function placeByName(name: PlacementName, anchor: AnchorBox, panel: PanelSize, viewport: PanelSize): FloatingSpot {
	const wanted = NAMED_SPOTS[name].wanted(anchor);
	const away = NAMED_SPOTS[name].away(anchor, panel);
	const flipsX = wanted.left + panel.width > viewport.width - SCREEN_MARGIN_PX;
	const flipsY = wanted.top + panel.height > viewport.height - SCREEN_MARGIN_PX;
	const left = flipsX ? Math.max(SCREEN_MARGIN_PX, away.left) : wanted.left;
	const top = flipsY ? Math.max(SCREEN_MARGIN_PX, away.top) : wanted.top;
	return {
		left,
		top,
		side: name,
		align: flipsX ? "end" : "start",
		origin: `${flipsX ? "right" : "left"} ${flipsY ? "bottom" : "top"}`,
		availableWidth: viewport.width - SCREEN_MARGIN_PX - left,
		availableHeight: viewport.height - SCREEN_MARGIN_PX - top,
	};
}
