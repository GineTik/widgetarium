import { useSyncExternalStore } from "react";
import { contentHash } from "@widgetarium/core/engine/content-hash.js";
import type { Drawing } from "./design-canvas-shapes.js";
import { framePictureOf, keepFramePicture } from "./design-pictures-store.js";
import { msSinceMoved } from "./design-zoom.js";
import { canvasOf } from "./off-screen.js";

export interface ShownPicture {
	readonly key: string;
	readonly url: string;
}

const SNAPSHOT_SCALE = 0.5;
const SETTLED_AFTER_MS = 400;
const STILL_FOR_MS = 1500;
const AT_ONCE = 3;
const shown = new Map<string, ShownPicture>();
const waiting = new Map<string, { readonly key: string; readonly nodeOf: () => HTMLElement | null }>();
const queued: string[] = [];
const listeners = new Set<() => void>();
let taking = 0;
let lookStamp: string | null = null;

export function frameIdOf(widget: string, state: string): string {
	return `${widget}#${state}`;
}

export function snapshotKeyOf(registry: Drawing["registry"], widget: string, state: string, drawn: unknown): string {
	const definition = registry.get(widget);
	const builds = [widget, ...(definition?.uses ?? [])].map((id) => registry.get(id)?.buildKey ?? id);
	return contentHash(JSON.stringify([builds, state, drawn, lookStampOf()]));
}

export function useFramePicture(frame: string): ShownPicture | undefined {
	return useSyncExternalStore(subscribe, () => shown.get(frame));
}

export function useSnapshotsWaiting(): number {
	return useSyncExternalStore(subscribe, () => waiting.size);
}

export function askForSnapshot(frame: string, key: string, nodeOf: () => HTMLElement | null): void {
	if (shown.get(frame)?.key === key || waiting.get(frame)?.key === key) return;
	waiting.set(frame, { key, nodeOf });
	told();
	void storedOrQueued(frame, key);
}

async function storedOrQueued(frame: string, key: string): Promise<void> {
	const stored = await framePictureOf(frame).catch(() => null);
	if (stored && shown.get(frame)?.key !== stored.key) show(frame, stored.key, stored.picture);
	if (stored?.key === key) return settle(frame);
	queued.push(frame);
	window.setTimeout(takeMore, SETTLED_AFTER_MS);
}

function takeMore(): void {
	while (taking < AT_ONCE && queued.length > 0) {
		const frame = queued.shift();
		if (frame === undefined) return;
		taking += 1;
		void take(frame).finally(() => {
			taking -= 1;
			takeMore();
		});
	}
}

async function take(frame: string): Promise<void> {
	while (msSinceMoved() < STILL_FOR_MS) await pause(STILL_FOR_MS);
	const asked = waiting.get(frame);
	const node = asked?.nodeOf();
	if (!asked || !node?.isConnected) return settle(frame);
	try {
		const picture = await pictureOf(node);
		show(frame, asked.key, picture);
		await keepFramePicture(frame, asked.key, picture).catch((failure: unknown) =>
			console.warn("[widgetarium] a canvas picture was made but not kept; it is made again next time", failure),
		);
	} catch (failure) {
		console.warn("[widgetarium] a canvas picture was not made; the frame stays live", frame, failure);
	}
	settle(frame);
}

function show(frame: string, key: string, picture: Blob): void {
	const was = shown.get(frame);
	if (was) URL.revokeObjectURL(was.url);
	shown.set(frame, { key, url: URL.createObjectURL(picture) });
	told();
}

function settle(frame: string): void {
	waiting.delete(frame);
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
