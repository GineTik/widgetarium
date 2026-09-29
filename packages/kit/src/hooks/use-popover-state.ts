import { useId, useRef, useState } from "react";
import { PLACEMENTS } from "../constants/popover";
import { useCloseOnOutsidePress } from "./use-close-on-outside-press";
import { useControllableState } from "./use-controllable-state";
import { usePanelMotion } from "./use-panel-motion";

export function usePopoverState({ open, defaultOpen, onOpenChange, placement }) {
	const where = PLACEMENTS[placement] ?? PLACEMENTS.over;
	const [isOpen, setOpen] = useControllableState({ prop: open, defaultProp: defaultOpen, onChange: onOpenChange });
	const anchorRef = useRef(null);
	const panelRef = useRef(null);
	const triggerRef = useRef(null);
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
