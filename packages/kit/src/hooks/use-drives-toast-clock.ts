import { useEffect } from "react";
import { TOAST_QUEUE } from "../utils/toast-queue";

export interface ToastClockAsk {
	readonly defaultDurationMs: number;
	readonly isPaused: boolean;
}

export function useDrivesToastClock({ defaultDurationMs, isPaused }: ToastClockAsk): void {
	useEffect(() => TOAST_QUEUE.setDefaultDuration(defaultDurationMs), [defaultDurationMs]);
	useEffect(() => TOAST_QUEUE.attachToaster(), []);
	useEffect(() => {
		if (!isPaused) return undefined;
		TOAST_QUEUE.pause();
		return () => TOAST_QUEUE.resume();
	}, [isPaused]);
}
