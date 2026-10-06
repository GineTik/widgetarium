import { useSyncExternalStore } from "react";
import { canvasOf } from "./off-screen.js";
import { msSinceMoved } from "./design-zoom.js";

const SNAPSHOT_SCALE = 0.5;
const SETTLED_AFTER_MS = 1200;
const IDLE_WITHIN_MS = 2000;
const STILL_FOR_MS = 1500;
const pictures = new Map<string, string>();
const waiting = new Map<string, () => HTMLElement | null>();
const listeners = new Set<() => void>();
const stamps = new WeakMap<object, number>();
let lastStamp = 0;
let isTaking = false;

export function snapshotKeyOf(definition: object | null | undefined, widget: string, state: string): string {
	if (!definition) return `${widget}#${state}#none`;
	if (!stamps.has(definition)) stamps.set(definition, ++lastStamp);
	return `${widget}#${state}#${stamps.get(definition) ?? 0}`;
}

export function useSnapshot(key: string): string | undefined {
	return useSyncExternalStore(subscribe, () => pictures.get(key));
}

export function useSnapshotsWaiting(): number {
	return useSyncExternalStore(subscribe, () => waiting.size);
}

export function askForSnapshot(key: string, nodeOf: () => HTMLElement | null): void {
	if (pictures.has(key) || waiting.has(key)) return;
	waiting.set(key, nodeOf);
	told();
	if (isTaking) return;
	isTaking = true;
	window.setTimeout(takeNext, SETTLED_AFTER_MS);
}

function takeNext(): void {
	const next = waiting.entries().next();
	isTaking = !next.done;
	if (next.done) return;
	const [key, nodeOf] = next.value;
	window.requestIdleCallback(() => void take(key, nodeOf()), { timeout: IDLE_WITHIN_MS });
}

async function take(key: string, node: HTMLElement | null): Promise<void> {
	if (msSinceMoved() < STILL_FOR_MS) {
		window.setTimeout(() => void take(key, node), STILL_FOR_MS);
		return;
	}
	try {
		if (node?.isConnected) pictures.set(key, await pictureOf(node));
	} catch (failure) {
		console.warn("[widgetarium] a canvas picture was not made; the frame stays live", key, failure);
	}
	waiting.delete(key);
	told();
	takeNext();
}

async function pictureOf(node: HTMLElement): Promise<string> {
	const canvas = await canvasOf(node, SNAPSHOT_SCALE);
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
	if (!blob) throw new Error("the canvas gave no picture");
	return URL.createObjectURL(blob);
}

function told(): void {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
