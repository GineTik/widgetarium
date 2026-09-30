import { useEffect } from "react";
import type { RefObject } from "react";
import { PRESS_EVENTS } from "../constants/popover";
import { isNode } from "../utils/dom-nodes";

export interface OutsidePressAsk {
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly anchorRef: RefObject<Element | null>;
	readonly panelRef: RefObject<Element | null>;
}

const CAPTURE_PAST_THE_EDITOR_SHIELD = true;

export function useCloseOnOutsidePress({ isOpen, setOpen, anchorRef, panelRef }: OutsidePressAsk): void {
	useEffect(() => {
		if (!isOpen) return undefined;
		const closeOnOutsidePress = (event: Event): void => {
			const target = isNode(event.target) ? event.target : null;
			if (panelRef.current?.contains(target)) return;
			if (anchorRef.current?.contains(target)) return;
			setOpen(false);
		};
		const closeOnEscape = (event: KeyboardEvent): void => {
			if (event.key === "Escape") setOpen(false);
		};
		for (const name of PRESS_EVENTS)
			document.addEventListener(name, closeOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
		document.addEventListener("keydown", closeOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
		return () => {
			for (const name of PRESS_EVENTS)
				document.removeEventListener(name, closeOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
			document.removeEventListener("keydown", closeOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
		};
	}, [isOpen, setOpen]);
}
