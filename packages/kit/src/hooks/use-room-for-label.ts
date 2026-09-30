import { useRef, useState } from "react";
import type { RefObject } from "react";
import { useResizeWatch } from "./use-resize-watch";

const NOT_LAID_OUT_YET = 0;

export function useRoomForLabel(controlRef: RefObject<Element | null>): boolean {
	const [isFitting, setFitting] = useState(true);
	// TRADE-OFF: remembered — a collapsed control no longer holds the label to re-measure
	const needed = useRef(0);

	useResizeWatch(controlRef, (control) => {
		const room = control.clientWidth;
		if (room === NOT_LAID_OUT_YET) return;
		// TRADE-OFF: found, not handed over — preact strips `ref` off a function component
		const label = control.querySelector(".wg-kit-btn-label");
		if (label) needed.current = room - label.clientWidth + label.scrollWidth;
		if (needed.current === 0) return;
		setFitting(room >= needed.current);
	});

	return isFitting;
}
