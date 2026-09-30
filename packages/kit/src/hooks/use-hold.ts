import { useRef, useState } from "react";
import type { RefObject } from "react";

export interface Hold {
	readonly isGrabbed: boolean;
	readonly held: RefObject<boolean>;
	readonly hold: (isHeld: boolean) => void;
}

export function useHold(): Hold {
	const [isGrabbed, setGrabbed] = useState(false);
	const held = useRef(false);
	const hold = (isHeld: boolean): void => {
		held.current = isHeld;
		setGrabbed(isHeld);
	};
	return { isGrabbed, held, hold };
}
