import { useId, useRef, useState } from "react";
import type { RefObject } from "react";
import { PLACEMENTS } from "../constants/popover";
import type { Placement, PlacementName } from "../constants/popover";
import { useCloseOnOutsidePress } from "./use-close-on-outside-press";
import { useControllableState } from "./use-controllable-state";
import { usePanelMotion } from "./use-panel-motion";

export interface PopoverAsk {
	readonly open?: boolean | undefined;
	readonly defaultOpen: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly placement: PlacementName;
}

export interface PopoverState {
	readonly id: string;
	readonly where: Placement;
	readonly placement: PlacementName;
	readonly isOpen: boolean;
	readonly isExiting: boolean;
	readonly shown: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly anchorRef: RefObject<HTMLSpanElement | null>;
	readonly panelRef: RefObject<HTMLDivElement | null>;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly openedByKeyboard: RefObject<boolean>;
}

export function usePopoverState({ open, defaultOpen, onOpenChange, placement }: PopoverAsk): PopoverState {
	const where = placementNamed(placement);
	const [isOpen, setOpen] = useControllableState({ prop: open, defaultProp: defaultOpen, onChange: onOpenChange });
	const anchorRef = useRef<HTMLSpanElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLElement>(null);
	const openedByKeyboard = useRef(false);
	const id = useId();

	const [isExiting, setExiting] = useState(false);
	const wasOpen = useRef(false);
	const shown = isOpen || isExiting || wasOpen.current;

	usePanelMotion({ isOpen, where, anchorRef, panelRef, triggerRef, openedByKeyboard, wasOpen, setExiting });
	useCloseOnOutsidePress({ isOpen, setOpen, anchorRef, panelRef });

	return {
		id,
		where,
		placement,
		isOpen,
		isExiting,
		shown,
		setOpen,
		anchorRef,
		panelRef,
		triggerRef,
		openedByKeyboard,
	};
}

function placementNamed(name: unknown): Placement {
	return name === "below" ? PLACEMENTS.below : PLACEMENTS.over;
}
