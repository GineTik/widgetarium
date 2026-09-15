import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findBrowser } from "./harness.mjs";

export async function paged(file, gate, asked) {
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

export function waited(ms) {
	return new Promise((done) => setTimeout(done, ms));
}

function handled(socket, chrome) {
	return {
		ask: socket.ask,
		close: () => {
			socket.close();
			chrome.kill();
		},
	};
}

function spawned(browser, file, { size }, profile) {
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

async function socketFor(profile) {
	const port = await portFrom(profile);
	if (!port) return null;
	return targetIn(port);
}

async function portFrom(profile) {
	const at = path.join(profile, "DevToolsActivePort");
	for (let tries = 0; tries < 200; tries += 1) {
		await waited(50);
		if (existsSync(at)) return Number(readFileSync(at, "utf8").split("\n")[0]) || null;
	}
	return null;
}

async function targetIn(port) {
	for (let tries = 0; tries < 100; tries += 1) {
		const found = await targetNow(port);
		if (found) return found;
		await waited(50);
	}
	return null;
}

async function targetNow(port) {
	try {
		const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
		return list.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl)?.webSocketDebuggerUrl ?? null;
	} catch {
		return null;
	}
}

async function talking(socketUrl) {
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

function opening(socket) {
	return new Promise((done, fail) => {
		socket.addEventListener("open", done, { once: true });
		socket.addEventListener("error", fail, { once: true });
	});
}

function sender(socket) {
	const pending = new Map();
	let ticket = 0;
	pumping(socket, pending);
	return (method, params) =>
		new Promise((done, fail) => {
			const id = (ticket += 1);
			pending.set(id, { done, fail });
			socket.send(JSON.stringify({ id, method, params }));
		});
}

function pumping(socket, pending) {
	socket.addEventListener("message", (event) => {
		const message = JSON.parse(event.data);
		pending.get(message.id)?.done(message);
		pending.delete(message.id);
	});
	const abandon = () => {
		for (const waiting of pending.values()) waiting.fail(new Error("chrome closed the socket before it answered"));
		pending.clear();
	};
	socket.addEventListener("close", abandon);
	socket.addEventListener("error", abandon);
}

async function answered(send, expression) {
	const reply = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
	if (reply.result?.exceptionDetails)
		throw new Error(
			`the page threw: ${JSON.stringify(reply.result.exceptionDetails.exception ?? reply.result.exceptionDetails)}`,
		);
	return reply.result.result.value;
}
