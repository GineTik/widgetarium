import { useRef } from "react";
import type { PointerEvent } from "react";
import { HOVER_OPEN_MS } from "../constants/overlays";
import { useDelayed } from "./use-delayed";

export interface HoverOpen {
	readonly onPointerEnter: (event: PointerEvent) => void;
	readonly onPointerLeave: () => void;
	readonly forgetHover: () => void;
}

export function useHoverOpen(setOpen: (open: boolean) => void): HoverOpen {
	const delayed = useDelayed();
	const isOpenedByHover = useRef(false);
	const openByHover = (): void => {
		isOpenedByHover.current = true;
		setOpen(true);
	};
	const forgetHover = (): void => {
		delayed.stop();
		isOpenedByHover.current = false;
	};
	return {
		onPointerEnter: (event) => {
			if (event.pointerType === "mouse") delayed.start(openByHover, HOVER_OPEN_MS);
		},
		onPointerLeave: () => {
			const wasOpenedByHover = isOpenedByHover.current;
			forgetHover();
			if (wasOpenedByHover) setOpen(false);
		},
		forgetHover,
	};
}
