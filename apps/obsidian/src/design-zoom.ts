import { useSyncExternalStore } from "react";

const FAR_BELOW_SCALE = 0.5;
const listeners = new Set<() => void>();
let scaleNow = 1;
let movedAt = 0;

export function movedNow(): void {
	movedAt = Date.now();
}

export function msSinceMoved(): number {
	return Date.now() - movedAt;
}

export function zoomSettledAt(scale: number): void {
	const wasFar = isFarAt(scaleNow);
	scaleNow = scale;
	if (wasFar !== isFarAt(scale)) for (const listener of listeners) listener();
}

export function useIsFar(): boolean {
	return useSyncExternalStore(subscribe, () => isFarAt(scaleNow));
}

function isFarAt(scale: number): boolean {
	return scale < FAR_BELOW_SCALE;
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
