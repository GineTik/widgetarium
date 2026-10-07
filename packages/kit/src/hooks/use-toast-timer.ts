import { useEffect, useRef } from "react";
import { TOAST_QUEUE } from "../utils/toast-queue";
import type { ToastRecord } from "../utils/toast-queue";

export function useToastTimer(record: ToastRecord, isPaused: boolean, fallbackMs: number): void {
	const remaining = useRef(Infinity);
	const timedVersion = useRef(-1);
	useEffect(() => {
		if (timedVersion.current !== record.version) {
			timedVersion.current = record.version;
			remaining.current = lifetimeOf(record, fallbackMs);
		}
		if (isPaused || record.isLeaving || !Number.isFinite(remaining.current)) return undefined;
		const startedAt = Date.now();
		const timer = setTimeout(() => TOAST_QUEUE.expire(record.id), remaining.current);
		return () => {
			clearTimeout(timer);
			remaining.current -= Date.now() - startedAt;
		};
	}, [isPaused, record.isLeaving, record.version]);
}

function lifetimeOf(record: ToastRecord, fallbackMs: number): number {
	if (record.duration !== undefined) return record.duration;
	return record.type === "loading" ? Infinity : fallbackMs;
}
