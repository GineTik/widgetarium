import { useEffect } from "react";
import type { RefObject } from "react";
import { focusInitial, focusQuietly, trapTab } from "../utils/focus";

export function useFocusTrap(panelRef: RefObject<HTMLElement | null>, isActive: boolean): void {
	useEffect(() => {
		const panel = panelRef.current;
		if (!isActive || !panel) return undefined;
		const before = document.activeElement;
		focusInitial(panel);
		const keepTabInside = (event: KeyboardEvent): void => trapTab(event, panel);
		panel.addEventListener("keydown", keepTabInside);
		return () => {
			panel.removeEventListener("keydown", keepTabInside);
			focusQuietly(before);
		};
	}, [isActive]);
}
