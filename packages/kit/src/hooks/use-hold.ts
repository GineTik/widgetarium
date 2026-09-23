import { useRef, useState } from "react";

export function useHold() {
	const [isGrabbed, setGrabbed] = useState(false);
	const held = useRef(false);
	const hold = (isHeld) => {
		held.current = isHeld;
		setGrabbed(isHeld);
	};
	return { isGrabbed, held, hold };
}
