import { useEffect, useState } from "react";

export interface Presence {
	readonly isMounted: boolean;
	readonly isExiting: boolean;
}

export interface HeldPresence extends Presence {
	readonly release: () => void;
}

export function useHeldPresence(isOpen: boolean): HeldPresence {
	const [isHeld, setHeld] = useState(isOpen);
	useEffect(() => {
		if (isOpen) setHeld(true);
	}, [isOpen]);
	return { isMounted: isOpen || isHeld, isExiting: !isOpen && isHeld, release: () => setHeld(false) };
}
