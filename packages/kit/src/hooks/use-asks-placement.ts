import { useLayoutEffect } from "react";
import { DRAWN_ALIGN, DRAWN_SIDES } from "../constants/popover";
import type { PlacementName, PopoverAlign, PopoverSide } from "../constants/popover";
import { warnOnce } from "../utils/surface";

export interface PlacementAsk {
	readonly side: PopoverSide | undefined;
	readonly align: PopoverAlign | undefined;
	readonly askPlacement: ((placement: PlacementName) => void) | undefined;
}

const DRAWN_BELOW = "a popover opens below its trigger and flips above it when there is no room";

export function useAsksPlacement({ side, align, askPlacement }: PlacementAsk): void {
	useLayoutEffect(() => {
		if (side === undefined && align === undefined) return;
		if (!isDrawnAsAsked(side, align)) warnOnce(`side "${side}" or align "${align}" is not drawn; ${DRAWN_BELOW}`);
		askPlacement?.("below");
	}, [side, align]);
}

function isDrawnAsAsked(side: PopoverSide | undefined, align: PopoverAlign | undefined): boolean {
	return (side === undefined || DRAWN_SIDES.includes(side)) && (align === undefined || align === DRAWN_ALIGN);
}
