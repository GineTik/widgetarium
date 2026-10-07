import { useEffect, useRef } from "react";
import { PRESS_EVENTS } from "../constants/popover";
import { isNode } from "../utils/dom-nodes";

export interface OutsidePress {
	readonly isOpen: boolean;
	readonly isInside: (node: Node) => boolean;
	readonly onOutside: () => void;
}

const CAPTURE_PAST_THE_EDITOR_SHIELD = true;

export function useOutsidePress(ask: OutsidePress): void {
	const latest = useRef(ask);
	latest.current = ask;
	useEffect(() => {
		if (!ask.isOpen) return undefined;
		const closeOnOutsidePress = (event: Event): void => {
			if (!isNode(event.target) || latest.current.isInside(event.target)) return;
			latest.current.onOutside();
		};
		for (const name of PRESS_EVENTS)
			document.addEventListener(name, closeOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
		return () => {
			for (const name of PRESS_EVENTS)
				document.removeEventListener(name, closeOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
		};
	}, [ask.isOpen]);
}
