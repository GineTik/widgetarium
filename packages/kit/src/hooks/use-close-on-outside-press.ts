import { useEffect } from "react";
import { PRESS_EVENTS } from "../constants/popover";

const CAPTURE_PAST_THE_EDITOR_SHIELD = true;

export function useCloseOnOutsidePress({ isOpen, setOpen, anchorRef, panelRef }) {
	useEffect(() => {
		if (!isOpen) return;
		const closeOnOutsidePress = (event) => {
			if (panelRef.current?.contains(event.target)) return;
			if (anchorRef.current?.contains(event.target)) return;
			setOpen(false);
		};
		const closeOnEscape = (event) => {
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
