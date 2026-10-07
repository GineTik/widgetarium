import { useLayoutEffect } from "react";
import { DEFAULT_SIDE_OFFSET } from "../constants/popover";
import type { PlacementChoice, PopoverAlign, PopoverSide } from "../constants/popover";

export interface PlacementAsk {
	readonly side: PopoverSide | undefined;
	readonly align: PopoverAlign | undefined;
	readonly sideOffset?: number | undefined;
	readonly alignOffset?: number | undefined;
	readonly askPlacement: ((placement: PlacementChoice) => void) | undefined;
}

export function useAsksPlacement({ side, align, sideOffset, alignOffset, askPlacement }: PlacementAsk): void {
	useLayoutEffect(() => {
		if (side === undefined && align === undefined && sideOffset === undefined) return;
		askPlacement?.({
			side: side ?? "bottom",
			align: align ?? "center",
			sideOffset: sideOffset ?? DEFAULT_SIDE_OFFSET,
			alignOffset: alignOffset ?? 0,
		});
	}, [side, align, sideOffset, alignOffset]);
}
