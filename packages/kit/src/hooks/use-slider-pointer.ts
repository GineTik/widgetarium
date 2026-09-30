import type { PointerEvent, RefObject } from "react";
import { useHold } from "./use-hold";
import { percentUnder } from "../utils/slider";
import type { ReportPercent } from "../utils/slider";

export interface TrackProps {
	readonly onPointerDown: (event: PointerEvent) => void;
	readonly onPointerMove: (event: PointerEvent) => void;
	readonly onPointerUp: () => void;
	readonly onPointerCancel: () => void;
}

export interface SliderPointer {
	readonly isGrabbed: boolean;
	readonly trackProps: TrackProps;
}

export function useSliderPointer(trackRef: RefObject<Element | null>, report: ReportPercent): SliderPointer {
	const { isGrabbed, held, hold } = useHold();
	const grab = (event: PointerEvent): void => {
		hold(true);
		event.currentTarget.setPointerCapture?.(event.pointerId);
		report(percentUnder(trackRef.current, event));
	};
	const drag = (event: PointerEvent): void => {
		if (held.current) report(percentUnder(trackRef.current, event));
	};
	const release = (): void => hold(false);
	return {
		isGrabbed,
		trackProps: { onPointerDown: grab, onPointerMove: drag, onPointerUp: release, onPointerCancel: release },
	};
}
