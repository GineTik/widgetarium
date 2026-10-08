import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export interface Delayed {
	readonly start: (run: () => void, ms: number) => void;
	readonly stop: () => void;
}

type Timer = ReturnType<typeof setTimeout>;

type HeldTimer = RefObject<Timer | null>;

export function useDelayed(): Delayed {
	const held = useRef<Timer | null>(null);
	const stop = (): void => stopTimer(held);
	useEffect(() => stop, []);
	return { start: (run, ms) => startTimer(held, run, ms), stop };
}

function stopTimer(held: HeldTimer): void {
	if (held.current !== null) clearTimeout(held.current);
	held.current = null;
}

function startTimer(held: HeldTimer, run: () => void, ms: number): void {
	stopTimer(held);
	if (ms <= 0) {
		run();
		return;
	}
	held.current = setTimeout(run, ms);
}
