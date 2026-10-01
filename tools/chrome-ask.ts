import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findBrowser } from "./harness.ts";

export type PageSize = readonly [number, number];

export interface PageAsk {
	readonly size: PageSize;
}

export interface AskedPage {
	readonly ask: (expression: string) => Promise<unknown>;
	readonly close: () => void;
}

interface PageSocket {
	readonly close: () => void;
	readonly ask: (expression: string) => Promise<unknown>;
	readonly viewportSetTo: (size: PageSize) => Promise<unknown>;
}

interface Waiting {
	readonly done: (message: unknown) => void;
	readonly fail: (error: Error) => void;
}

type Send = (method: string, params: Readonly<Record<string, unknown>>) => Promise<unknown>;

export async function paged(file: string, gate: string, asked: PageAsk): Promise<AskedPage> {
	const browser = findBrowser(gate);
	const profile = mkdtempSync(path.join(tmpdir(), "wg-ask-profile-"));
	const chrome = spawned(browser, file, asked, profile);
	const socketUrl = await socketFor(profile);
	if (!socketUrl) {
		chrome.kill();
		throw new Error(`chrome never opened a page for ${file}`);
	}
	const socket = await talking(socketUrl);
	await socket.viewportSetTo(asked.size);
	return handled(socket, chrome);
}

export function waited(ms: number): Promise<void> {
	return new Promise((done) => setTimeout(done, ms));
}

function handled(socket: PageSocket, chrome: ChildProcess): AskedPage {
	return {
		ask: socket.ask,
		close: () => {
			socket.close();
			chrome.kill();
		},
	};
}

function spawned(browser: string, file: string, { size }: PageAsk, profile: string): ChildProcess {
	return spawn(
		browser,
		[
			"--headless=new",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--no-first-run",
			"--no-default-browser-check",
			`--window-size=${size[0]},${size[1]}`,
			"--remote-debugging-port=0",
			`--user-data-dir=${profile}`,
			`file://${file}`,
		],
		{ stdio: ["ignore", "ignore", "ignore"] },
	);
}

async function socketFor(profile: string): Promise<string | null> {
	const port = await portFrom(profile);
	if (!port) return null;
	return targetIn(port);
}

async function portFrom(profile: string): Promise<number | null> {
	const at = path.join(profile, "DevToolsActivePort");
	for (let tries = 0; tries < 200; tries += 1) {
		await waited(50);
		if (existsSync(at)) return Number(readFileSync(at, "utf8").split("\n")[0]) || null;
	}
	return null;
}

async function targetIn(port: number): Promise<string | null> {
	for (let tries = 0; tries < 100; tries += 1) {
		const found = await targetNow(port);
		if (found) return found;
		await waited(50);
	}
	return null;
}

async function targetNow(port: number): Promise<string | null> {
	try {
		const list: unknown = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
		if (!Array.isArray(list)) return null;
		for (const entry of list) {
			const socketUrl = pageSocketOf(entry);
			if (socketUrl) return socketUrl;
		}
		return null;
	} catch {
		return null;
	}
}

function pageSocketOf(entry: unknown): string | null {
	if (typeof entry !== "object" || entry === null) return null;
	if (!("type" in entry) || entry.type !== "page") return null;
	if (!("webSocketDebuggerUrl" in entry) || typeof entry.webSocketDebuggerUrl !== "string") return null;
	return entry.webSocketDebuggerUrl || null;
}

async function talking(socketUrl: string): Promise<PageSocket> {
	const socket = new WebSocket(socketUrl);
	await opening(socket);
	const send = sender(socket);
	return {
		close: () => socket.close(),
		ask: (expression) => answered(send, expression),
		viewportSetTo: ([width, height]) =>
			send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }),
	};
}

function opening(socket: WebSocket): Promise<unknown> {
	return new Promise((done, fail) => {
		socket.addEventListener("open", done, { once: true });
		socket.addEventListener("error", fail, { once: true });
	});
}

function sender(socket: WebSocket): Send {
	const pending = new Map<unknown, Waiting>();
	let ticket = 0;
	pumping(socket, pending);
	return (method, params) =>
		new Promise((done, fail) => {
			const id = (ticket += 1);
			pending.set(id, { done, fail });
			socket.send(JSON.stringify({ id, method, params }));
		});
}

function pumping(socket: WebSocket, pending: Map<unknown, Waiting>): void {
	socket.addEventListener("message", (event: MessageEvent<unknown>) => {
		const message: unknown = JSON.parse(String(event.data));
		const id = fieldOf(message, "id");
		pending.get(id)?.done(message);
		pending.delete(id);
	});
	const abandon = (): void => {
		for (const waiting of pending.values()) waiting.fail(new Error("chrome closed the socket before it answered"));
		pending.clear();
	};
	socket.addEventListener("close", abandon);
	socket.addEventListener("error", abandon);
}

function fieldOf(value: unknown, name: string): unknown {
	if (typeof value !== "object" || value === null || !(name in value)) return undefined;
	return Reflect.get(value, name);
}

async function answered(send: Send, expression: string): Promise<unknown> {
	const reply = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
	const result = fieldOf(reply, "result");
	const exceptionDetails = fieldOf(result, "exceptionDetails");
	if (exceptionDetails)
		throw new Error(`the page threw: ${JSON.stringify(fieldOf(exceptionDetails, "exception") ?? exceptionDetails)}`);
	return fieldOf(fieldOf(result, "result"), "value");
}
