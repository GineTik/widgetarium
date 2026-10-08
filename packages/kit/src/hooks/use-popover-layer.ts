import type { Placement } from "../constants/popover";
import { useDismissLayer } from "./use-dismiss-layer";
import { useHeldPresence } from "./use-held-presence";
import type { HeldPresence } from "./use-held-presence";
import { usePanelMotion } from "./use-panel-motion";
import type { PopoverParts } from "./use-popover-parts";

export interface PopoverLayerAsk {
	readonly parts: PopoverParts;
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly where: Placement;
	readonly onExited: (() => void) | undefined;
}

export function usePopoverLayer({ parts, isOpen, setOpen, where, onExited }: PopoverLayerAsk): HeldPresence {
	const presence = useHeldPresence(isOpen);
	const close = (): void => setOpen(false);
	usePanelMotion({ ...parts, isOpen, where, release: presence.release, onExited });
	useDismissLayer({
		isOpen,
		holds: (node) => Boolean(parts.panelRef.current?.contains(node) || parts.anchorRef.current?.contains(node)),
		onEscape: close,
		onOutsidePress: close,
	});
	return presence;
}
