import { useEffect } from "react";

export function useStopOnUnmount(gestureRef) {
	useEffect(
		() => () => {
			gestureRef.current?.stop();
			gestureRef.current = null;
		},
		[],
	);
}
