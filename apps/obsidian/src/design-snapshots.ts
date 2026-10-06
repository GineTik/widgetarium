import { useSyncExternalStore } from "react";
import { contentHash } from "@widgetarium/core/engine/content-hash.js";
import type { Drawing } from "./design-canvas-shapes.js";
import { storePicture, storedPictureOf } from "./design-pictures-store.js";
import { msSinceMoved } from "./design-zoom.js";
import { canvasOf } from "./off-screen.js";

const SNAPSHOT_SCALE = 0.5;
const SETTLED_AFTER_MS = 400;
const STILL_FOR_MS = 1500;
const AT_ONCE = 3;
const pictures = new Map<string, string>();
const waiting = new Map<string, () => HTMLElement | null>();
const queued: string[] = [];
const listeners = new Set<() => void>();
let taking = 0;
let lookStamp: string | null = null;

// TODO: prune stored pictures no canvas asked for in a month.
export function snapshotKeyOf(registry: Drawing["registry"], widget: string, state: string, drawn: unknown): string {
	const definition = registry.get(widget);
	const builds = [widget, ...(definition?.uses ?? [])].map((id) => registry.get(id)?.buildKey ?? id);
	return contentHash(JSON.stringify([builds, state, drawn, lookStampOf()]));
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
	void storedOrQueued(key);
}

async function storedOrQueued(key: string): Promise<void> {
	const stored = await storedPictureOf(key).catch(() => null);
	if (stored) return settle(key, URL.createObjectURL(stored));
	queued.push(key);
	window.setTimeout(takeMore, SETTLED_AFTER_MS);
}

function takeMore(): void {
	while (taking < AT_ONCE && queued.length > 0) {
		const key = queued.shift();
		if (key === undefined) return;
		taking += 1;
		void take(key).finally(() => {
			taking -= 1;
			takeMore();
		});
	}
}

async function take(key: string): Promise<void> {
	while (msSinceMoved() < STILL_FOR_MS) await pause(STILL_FOR_MS);
	const node = waiting.get(key)?.();
	if (!node?.isConnected) return settle(key, null);
	try {
		const picture = await pictureOf(node);
		void storePicture(key, picture).catch((failure: unknown) =>
			console.warn("[widgetarium] a canvas picture was made but not kept", failure),
		);
		settle(key, URL.createObjectURL(picture));
	} catch (failure) {
		console.warn("[widgetarium] a canvas picture was not made; the frame stays live", key, failure);
		settle(key, null);
	}
}

function settle(key: string, url: string | null): void {
	if (url) pictures.set(key, url);
	waiting.delete(key);
	told();
}

async function pictureOf(node: HTMLElement): Promise<Blob> {
	const canvas = await canvasOf(node, SNAPSHOT_SCALE);
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
	if (!blob) throw new Error("the canvas gave no picture");
	return blob;
}

function lookStampOf(): string {
	lookStamp ??= contentHash(
		[...document.querySelectorAll("style")]
			.map((style) => style.textContent ?? "")
			.filter((sheet) => sheet.includes(".wg-"))
			.join("\n"),
	);
	return `${lookStamp}:${document.body.classList.contains("theme-dark") ? "dark" : "light"}`;
}

function pause(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function told(): void {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
