import { useHold } from "./use-hold";
import { percentUnder } from "../utils/slider";

export function useSliderPointer(trackRef, report) {
	const { isGrabbed, held, hold } = useHold();
	const grab = (event) => {
		hold(true);
		event.currentTarget.setPointerCapture?.(event.pointerId);
		report(percentUnder(trackRef.current, event));
	};
	const drag = (event) => {
		if (held.current) report(percentUnder(trackRef.current, event));
	};
	const release = () => hold(false);
	return {
		isGrabbed,
		trackProps: { onPointerDown: grab, onPointerMove: drag, onPointerUp: release, onPointerCancel: release },
	};
}
