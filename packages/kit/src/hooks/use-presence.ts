import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../utils/popover-motion";

export interface Presence {
	readonly isMounted: boolean;
	readonly isExiting: boolean;
}

export function usePresence(isOpen: boolean, exitMs: number): Presence {
	const [isHeld, setHeld] = useState(isOpen);
	useEffect(() => {
		if (isOpen) {
			setHeld(true);
			return undefined;
		}
		const timer = setTimeout(() => setHeld(false), prefersReducedMotion() ? 0 : exitMs);
		return () => clearTimeout(timer);
	}, [isOpen]);
	return { isMounted: isOpen || isHeld, isExiting: !isOpen && isHeld };
}
