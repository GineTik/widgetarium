import { useLayoutEffect } from "react";
import { DEFAULT_SIDE_OFFSET } from "../constants/popover";
import type { PlacementChoice, PopoverAlign, PopoverSide, SidePlacement } from "../constants/popover";

export interface PlacementAsk {
	readonly side?: PopoverSide | undefined;
	readonly align?: PopoverAlign | undefined;
	readonly sideOffset?: number | undefined;
	readonly alignOffset?: number | undefined;
	readonly askPlacement: ((placement: PlacementChoice) => void) | undefined;
}

export function useAsksPlacement(ask: PlacementAsk): void {
	useLayoutEffect(() => {
		if (isPlacementAsked(ask)) ask.askPlacement?.(askedPlacementOf(ask));
	}, [ask.side, ask.align, ask.sideOffset, ask.alignOffset]);
}

function isPlacementAsked({ side, align, sideOffset }: PlacementAsk): boolean {
	return side !== undefined || align !== undefined || sideOffset !== undefined;
}

function askedPlacementOf({ side, align, sideOffset, alignOffset }: PlacementAsk): SidePlacement {
	return {
		side: side ?? "bottom",
		align: align ?? "center",
		sideOffset: sideOffset ?? DEFAULT_SIDE_OFFSET,
		alignOffset: alignOffset ?? 0,
	};
}
