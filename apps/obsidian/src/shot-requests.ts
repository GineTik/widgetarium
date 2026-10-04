import { TFile } from "obsidian";
import type { App, WorkspaceLeaf } from "obsidian";
import { ROOT } from "@widgetarium/core/paths.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import type WidgetariumPlugin from "./main.js";
import { DESIGN_VIEW_TYPE } from "./design-view.js";

export const SHOTS_DIR = `${ROOT}/shots`;
export const SHOT_REQUESTS_DIR = `${SHOTS_DIR}/requests`;

const SHOT_POLL_MS = 1000;
const DRAWN_WAIT_MS = 10000;
const SETTLE_MS = 800;
const NO_NOTE = "{note} is not a note in this vault";
const NO_CAPTURE = "this Obsidian cannot capture its window";

interface Captured {
	toPNG: () => Uint8Array;
}

interface CapturingContents {
	capturePage: (rect: { x: number; y: number; width: number; height: number }) => Promise<Captured>;
}

export function answerShotRequests(plugin: WidgetariumPlugin): void {
	let isBusy = false;
	const poll = async (): Promise<void> => {
		if (isBusy) return;
		isBusy = true;
		await answerPending(plugin.app).catch((failure: unknown) =>
			console.error("[widgetarium] a shot was not taken", failure),
		);
		isBusy = false;
	};
	plugin.registerInterval(window.setInterval(() => void poll(), SHOT_POLL_MS));
}

async function answerPending(app: App): Promise<void> {
	const adapter = app.vault.adapter;
	if (!(await adapter.exists(SHOT_REQUESTS_DIR))) return;
	const { files } = await adapter.list(SHOT_REQUESTS_DIR);
	for (const path of files.filter((one) => one.endsWith(".json"))) {
		const id = path.slice(path.lastIndexOf("/") + 1, -".json".length);
		const asked = askedIn(await adapter.read(path));
		await adapter.remove(path);
		await answerOne(app, id, asked);
	}
}

async function answerOne(app: App, id: string, asked: ShotAsked): Promise<void> {
	const adapter = app.vault.adapter;
	try {
		await adapter.writeBinary(`${SHOTS_DIR}/${id}.png`, await shotOf(app, asked));
	} catch (failure) {
		await adapter.write(`${SHOTS_DIR}/${id}.failed.txt`, failure instanceof Error ? failure.message : String(failure));
	}
}

async function shotOf(app: App, asked: ShotAsked): Promise<ArrayBuffer> {
	const file = asked.design ? null : app.vault.getAbstractFileByPath(asked.note);
	if (!asked.design && !(file instanceof TFile)) throw new Error(NO_NOTE.replace("{note}", asked.note));
	const before = app.workspace.getMostRecentLeaf();
	const leaf = app.workspace.getLeaf("tab");
	try {
		if (file instanceof TFile) await leaf.openFile(file);
		else await leaf.setViewState({ type: DESIGN_VIEW_TYPE, active: true, state: { app: asked.design } });
		app.workspace.setActiveLeaf(leaf, { focus: false });
		return await capturedLeaf(leaf);
	} finally {
		leaf.detach();
		if (before) app.workspace.setActiveLeaf(before, { focus: false });
	}
}

async function capturedLeaf(leaf: WorkspaceLeaf): Promise<ArrayBuffer> {
	const pane = leaf.view.containerEl;
	await drawnIn(pane);
	const box = pane.getBoundingClientRect();
	const zoom = zoomFactor();
	const rect = {
		x: Math.round(box.x * zoom),
		y: Math.round(box.y * zoom),
		width: Math.round(box.width * zoom),
		height: Math.round(box.height * zoom),
	};
	const png = (await contentsOf().capturePage(rect)).toPNG();
	return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
}

async function drawnIn(pane: HTMLElement): Promise<void> {
	const until = Date.now() + DRAWN_WAIT_MS;
	while (Date.now() < until && !(pane.querySelector(".wg-root") && !pane.querySelector(".wg-kit-skeleton")))
		await pause(200);
	await pause(SETTLE_MS);
}

function contentsOf(): CapturingContents {
	const remote: unknown = window.require?.("@electron/remote");
	const contents: unknown =
		isObject(remote) && typeof remote["getCurrentWebContents"] === "function"
			? remote["getCurrentWebContents"]()
			: null;
	if (!isCapturing(contents)) throw new Error(NO_CAPTURE);
	return contents;
}

function zoomFactor(): number {
	const electron: unknown = window.require?.("electron");
	const frame: unknown = isObject(electron) ? electron["webFrame"] : null;
	const zoom: unknown = isObject(frame) && typeof frame["getZoomFactor"] === "function" ? frame["getZoomFactor"]() : 1;
	return typeof zoom === "number" && zoom > 0 ? zoom : 1;
}

function isCapturing(held: unknown): held is CapturingContents {
	return isObject(held) && typeof held["capturePage"] === "function";
}

interface ShotAsked {
	readonly note: string;
	readonly design: string;
}

function askedIn(text: string): ShotAsked {
	const parsed: unknown = JSON.parse(text);
	const textAt = (key: string): string => (isObject(parsed) && typeof parsed[key] === "string" ? parsed[key] : "");
	return { note: textAt("note"), design: textAt("design") };
}

function pause(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
