import { useRef, useState } from "react";
import { useResizeWatch } from "./use-resize-watch";

export function useRoomForLabel(controlRef) {
	const [isFitting, setFitting] = useState(true);
	// TRADE-OFF: remembered — a collapsed control no longer holds the label to re-measure
	const needed = useRef(0);

	useResizeWatch(controlRef, (control) => {
		const room = control.clientWidth;
		// CONTEXT: before the first layout every box is zero, which is not "no room"
		if (room === 0) return;
		// TRADE-OFF: found, not handed over — preact strips `ref` off a function component
		const label = control.querySelector(".wg-kit-btn-label");
		if (label) needed.current = room - label.clientWidth + label.scrollWidth;
		if (needed.current === 0) return;
		setFitting(room >= needed.current);
	});

	return isFitting;
}
