import { useEffect } from "react";
import type { RefObject } from "react";
import { focusInitial, focusQuietly } from "../utils/focus";

export function useFocusTrap(panelRef: RefObject<HTMLElement | null>, isActive: boolean): void {
	useEffect(() => {
		if (!isActive) return undefined;
		const before = document.activeElement;
		focusInitial(panelRef.current);
		return () => focusQuietly(before);
	}, [isActive]);
}
