import { useRef } from "react";
import type { PointerEvent, RefObject } from "react";
import { LONG_PRESS_MS, LONG_PRESS_SLOP_PX } from "../constants/overlays";
import { useDelayed } from "./use-delayed";
import type { Delayed } from "./use-delayed";

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

interface PressHeld {
	readonly delayed: Delayed;
	readonly pressedAt: RefObject<Pressed | null>;
}

export function useLongPress(onLongPress: (x: number, y: number) => void): LongPress {
	const held: PressHeld = { delayed: useDelayed(), pressedAt: useRef<Pressed | null>(null) };
	const release = (): void => releasePress(held);
	return {
		onPointerDown: (event) => startPress(event, held, onLongPress),
		onPointerMove: (event) => releaseIfSlipped(event, held),
		onPointerUp: release,
		onPointerCancel: release,
	};
}

function startPress(
	event: PointerEvent<HTMLElement>,
	held: PressHeld,
	onLongPress: (x: number, y: number) => void,
): void {
	if (event.pointerType === "mouse") return;
	const at = { x: event.clientX, y: event.clientY };
	held.pressedAt.current = at;
	held.delayed.start(() => onLongPress(at.x, at.y), LONG_PRESS_MS);
}

function releaseIfSlipped(event: PointerEvent<HTMLElement>, held: PressHeld): void {
	const at = held.pressedAt.current;
	if (at && Math.hypot(event.clientX - at.x, event.clientY - at.y) > LONG_PRESS_SLOP_PX) releasePress(held);
}

function releasePress(held: PressHeld): void {
	held.pressedAt.current = null;
	held.delayed.stop();
}
