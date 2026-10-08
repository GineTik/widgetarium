import { useRef } from "react";
import type { PointerEvent, RefObject } from "react";
import { HOVER_OPEN_MS } from "../constants/overlays";
import { useDelayed } from "./use-delayed";

export interface HoverOpen {
	readonly onPointerEnter: (event: PointerEvent) => void;
	readonly onPointerLeave: () => void;
	readonly forgetHover: () => void;
}

type SetOpen = (open: boolean) => void;

export function useHoverOpen(setOpen: SetOpen): HoverOpen {
	const delayed = useDelayed();
	const isOpenedByHover = useRef(false);
	const forgetHover = (): void => {
		delayed.stop();
		isOpenedByHover.current = false;
	};
	return {
		onPointerEnter: (event) => {
			if (event.pointerType === "mouse") delayed.start(() => openByHover(isOpenedByHover, setOpen), HOVER_OPEN_MS);
		},
		onPointerLeave: () => closeOpenedByHover(isOpenedByHover.current, forgetHover, setOpen),
		forgetHover,
	};
}

function openByHover(isOpenedByHover: RefObject<boolean>, setOpen: SetOpen): void {
	isOpenedByHover.current = true;
	setOpen(true);
}

function closeOpenedByHover(wasOpenedByHover: boolean, forgetHover: () => void, setOpen: SetOpen): void {
	forgetHover();
	if (wasOpenedByHover) setOpen(false);
}
