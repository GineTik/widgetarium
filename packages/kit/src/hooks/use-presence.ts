import { useEffect } from "react";
import { prefersReducedMotion } from "../utils/popover-motion";
import { useHeldPresence } from "./use-held-presence";
import type { Presence } from "./use-held-presence";

export function usePresence(isOpen: boolean, exitMs: number): Presence {
	const presence = useHeldPresence(isOpen);
	useEffect(() => {
		if (isOpen) return undefined;
		const timer = setTimeout(presence.release, prefersReducedMotion() ? 0 : exitMs);
		return () => clearTimeout(timer);
	}, [isOpen]);
	return presence;
}
