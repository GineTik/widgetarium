import { useRef } from "react";
import type { PointerEvent } from "react";
import { LONG_PRESS_MS, LONG_PRESS_SLOP_PX } from "../constants/overlays";
import { useDelayed } from "./use-delayed";

export interface LongPress {
	readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerUp: () => void;
	readonly onPointerCancel: () => void;
}

interface Pressed {
	readonly x: number;
	readonly y: number;
}

export function useLongPress(onLongPress: (x: number, y: number) => void): LongPress {
	const delayed = useDelayed();
	const pressedAt = useRef<Pressed | null>(null);
	const release = (): void => {
		pressedAt.current = null;
		delayed.stop();
	};
	return {
		onPointerDown: (event) => {
			if (event.pointerType === "mouse") return;
			const at = { x: event.clientX, y: event.clientY };
			pressedAt.current = at;
			delayed.start(() => onLongPress(at.x, at.y), LONG_PRESS_MS);
		},
		onPointerMove: (event) => {
			const at = pressedAt.current;
			if (at && Math.hypot(event.clientX - at.x, event.clientY - at.y) > LONG_PRESS_SLOP_PX) release();
		},
		onPointerUp: release,
		onPointerCancel: release,
	};
}
