import { useId, useRef } from "react";
import type { RefObject } from "react";
import type { Placement, PlacementChoice } from "../constants/popover";
import { placementOf } from "../utils/floating-placement";
import { useControllableState } from "./use-controllable-state";
import { useDismissLayer } from "./use-dismiss-layer";
import { usePanelMotion } from "./use-panel-motion";
import { useHeldPresence } from "./use-held-presence";

export interface PopoverAsk {
	readonly open?: boolean | undefined;
	readonly defaultOpen: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly placement: PlacementChoice;
	readonly onExited?: (() => void) | undefined;
}

export interface PopoverState {
	readonly id: string;
	readonly where: Placement;
	readonly placement: PlacementChoice;
	readonly isOpen: boolean;
	readonly isExiting: boolean;
	readonly shown: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly anchorRef: RefObject<HTMLSpanElement | null>;
	readonly pointRef: RefObject<HTMLElement | null>;
	readonly panelRef: RefObject<HTMLDivElement | null>;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly openedByKeyboard: RefObject<boolean>;
}

export function usePopoverState({ open, defaultOpen, onOpenChange, placement, onExited }: PopoverAsk): PopoverState {
	const id = useId();
	const where = placementOf(placement);
	const [isOpen, setOpen] = useControllableState({ prop: open, defaultProp: defaultOpen, onChange: onOpenChange });
	const anchorRef = useRef<HTMLSpanElement>(null);
	const pointRef = useRef<HTMLElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLElement>(null);
	const openedByKeyboard = useRef(false);
	const presence = useHeldPresence(isOpen);
	const close = (): void => setOpen(false);

	usePanelMotion({
		isOpen,
		where,
		anchorRef,
		pointRef,
		panelRef,
		triggerRef,
		openedByKeyboard,
		release: presence.release,
		onExited,
	});
	useDismissLayer({
		isOpen,
		holds: (node) => Boolean(panelRef.current?.contains(node) || anchorRef.current?.contains(node)),
		onEscape: close,
		onOutsidePress: close,
	});

	return {
		id,
		where,
		placement,
		isOpen,
		isExiting: presence.isExiting,
		shown: presence.isMounted,
		setOpen,
		anchorRef,
		pointRef,
		panelRef,
		triggerRef,
		openedByKeyboard,
	};
}
