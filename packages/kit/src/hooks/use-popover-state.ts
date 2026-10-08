import type { Placement, PlacementChoice } from "../constants/popover";
import { placementOf } from "../utils/floating-placement";
import { useOpenState } from "./use-open-state";
import { usePopoverLayer } from "./use-popover-layer";
import { usePopoverParts } from "./use-popover-parts";
import type { PopoverParts } from "./use-popover-parts";

export interface PopoverAsk {
	readonly open?: boolean | undefined;
	readonly defaultOpen: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly placement: PlacementChoice;
	readonly onExited?: (() => void) | undefined;
}

export interface PopoverState extends PopoverParts {
	readonly where: Placement;
	readonly placement: PlacementChoice;
	readonly isOpen: boolean;
	readonly isExiting: boolean;
	readonly shown: boolean;
	readonly setOpen: (open: boolean) => void;
}

export function usePopoverState(ask: PopoverAsk): PopoverState {
	const parts = usePopoverParts();
	const where = placementOf(ask.placement);
	const [isOpen, setOpen] = useOpenState(ask);
	const presence = usePopoverLayer({ parts, isOpen, setOpen, where, onExited: ask.onExited });
	return {
		...parts,
		where,
		placement: ask.placement,
		isOpen,
		isExiting: presence.isExiting,
		shown: presence.isMounted,
		setOpen,
	};
}
