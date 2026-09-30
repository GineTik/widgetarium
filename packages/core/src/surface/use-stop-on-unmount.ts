import { useEffect } from "react";
import type { MutableRefObject } from "react";

interface StoppableGesture {
	readonly stop: () => void;
}

export function useStopOnUnmount<Gesture extends StoppableGesture>(gestureRef: MutableRefObject<Gesture | null>): void {
	useEffect(
		() => () => {
			gestureRef.current?.stop();
			gestureRef.current = null;
		},
		[],
	);
}
