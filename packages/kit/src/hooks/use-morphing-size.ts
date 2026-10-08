import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { watchSizes } from "../utils/resize-watch";

export function useMorphingSize(panelRef: RefObject<HTMLElement | null>, inner: HTMLElement | null, key: string): void {
	useLayoutEffect(() => {
		if (!inner) return undefined;
		const fit = (): void => fitPanelTo(panelRef.current, inner);
		fit();
		return watchSizes([inner], fit);
	}, [inner, key]);
}

function fitPanelTo(panel: HTMLElement | null, inner: HTMLElement): void {
	if (!panel) return;
	panel.style.width = `${inner.offsetWidth}px`;
	panel.style.height = `${inner.offsetHeight}px`;
}
