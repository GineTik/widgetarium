import { Platform, arrayBufferToBase64, base64ToArrayBuffer, requestUrl } from "obsidian";
import type { ReactNode } from "react";
import { domToCanvas, domToPng } from "modern-screenshot";
import { render } from "@widgetarium/core/engine/render.js";

export interface OffScreenSize {
	readonly width?: number | undefined;
	readonly height?: number | undefined;
}

const DRAWN_WAIT_MS = 10000;
const SETTLE_MS = 800;
const STILL_LOADING = ".wg-kit-skeleton, .wg-design-seen:empty, .wg-mount:empty";
const STACK_GAP_PX = 40;
const NO_CANVAS = "this window cannot draw on a canvas";
const ON_THE_PICTURE = { position: "static", left: "0", top: "0" } as const;
const SYSTEM_FONT_KEYWORD = /-apple-system|system-ui|ui-sans-serif/;
const EMBEDDED_FAMILY = "Widgetarium System";
const NAMED_SYSTEM_FACES = `"${EMBEDDED_FAMILY}", "Segoe UI", Roboto`;
const MAC_SYSTEM_FONT_FILE = "/System/Library/Fonts/SFNS.ttf";
const EMBEDDED_FACE = `@font-face { font-family: "${EMBEDDED_FAMILY}"; font-weight: 1 1000; src: url(data:font/ttf;base64,{data}) format("truetype"); }`;

let systemFontFace: string | null | undefined;

export async function drawnOffScreen<T>(
	size: OffScreenSize,
	tree: ReactNode,
	read: (node: HTMLElement) => Promise<T>,
): Promise<T> {
	const node = document.body.createDiv({ cls: "wg-off-screen" });
	node.style.width = size.width ? `${size.width}px` : "max-content";
	if (size.height) node.style.height = `${size.height}px`;
	try {
		render(tree, node);
		await drawnIn(node);
		return await read(node);
	} finally {
		render(null, node);
		node.remove();
	}
}

export async function pngOf(node: HTMLElement): Promise<ArrayBuffer> {
	const url = await domToPng(node, pictureOptionsOf(node, 1));
	return base64ToArrayBuffer(url.slice(url.indexOf(",") + 1));
}

export function canvasOf(node: HTMLElement, scale: number): Promise<HTMLCanvasElement> {
	return domToCanvas(node, pictureOptionsOf(node, scale));
}

export async function stackedPngOf(canvases: readonly HTMLCanvasElement[]): Promise<ArrayBuffer> {
	const width = Math.max(1, ...canvases.map((one) => one.width));
	const height = canvases.reduce((sum, one) => sum + one.height + STACK_GAP_PX, STACK_GAP_PX);
	const stacked = document.createElement("canvas");
	stacked.width = width;
	stacked.height = height;
	const pen = stacked.getContext("2d");
	if (!pen) throw new Error(NO_CANVAS);
	pen.fillStyle = pageColourOf() ?? "white";
	pen.fillRect(0, 0, width, height);
	let top = STACK_GAP_PX;
	for (const one of canvases) {
		pen.drawImage(one, 0, top);
		top += one.height + STACK_GAP_PX;
	}
	const url = stacked.toDataURL("image/png");
	return base64ToArrayBuffer(url.slice(url.indexOf(",") + 1));
}

function pictureOptionsOf(node: HTMLElement, scale: number) {
	return {
		scale,
		width: node.offsetWidth,
		height: node.offsetHeight,
		backgroundColor: pageColourOf(),
		fetchFn: dataUrlOf,
		style: ON_THE_PICTURE,
		onCloneEachNode: namesTheSystemFont,
		...embeddedFontOf(),
	};
}

function pageColourOf(): string | null {
	return getComputedStyle(document.body).getPropertyValue("--background-primary").trim() || null;
}

function embeddedFontOf(): { font?: { cssText: string } } {
	systemFontFace ??= systemFontFaceRead();
	return systemFontFace ? { font: { cssText: systemFontFace } } : {};
}

function systemFontFaceRead(): string | null {
	if (!Platform.isMacOS || typeof require !== "function") return null;
	try {
		const fs: typeof import("node:fs") = require("node:fs");
		return EMBEDDED_FACE.replace("{data}", fs.readFileSync(MAC_SYSTEM_FONT_FILE).toString("base64"));
	} catch (failure) {
		console.warn("[widgetarium] shots fall back to a named font: the system font was not read", failure);
		return null;
	}
}

// TRADE-OFF: an SVG drawn as an image resolves no system font keyword, so the clone names an embedded copy of it.
function namesTheSystemFont(cloned: Node): void {
	if (!(cloned instanceof HTMLElement || cloned instanceof SVGElement)) return;
	if (cloned instanceof HTMLElement) keepsOneLine(cloned);
	const family = cloned.style.fontFamily;
	if (!SYSTEM_FONT_KEYWORD.test(family)) return;
	cloned.style.fontFamily = `${NAMED_SYSTEM_FACES}, ${family}`;
}

// TRADE-OFF: the clone carries the screen's widths, and a glyph a hair wider would wrap or clip a line that held on screen.
function keepsOneLine(cloned: HTMLElement): void {
	if (![...cloned.childNodes].every((child) => child.nodeType === Node.TEXT_NODE)) return;
	const fontPx = Number.parseFloat(cloned.style.fontSize) || 16;
	const linePx = Number.parseFloat(cloned.style.lineHeight) || fontPx * 1.4;
	if (Number.parseFloat(cloned.style.height) > linePx * 1.5) return;
	cloned.style.whiteSpace = "nowrap";
	cloned.style.overflow = "visible";
	cloned.style.textOverflow = "clip";
}

async function dataUrlOf(url: string): Promise<string | false> {
	if (!url.startsWith("http")) return false;
	const answer = await requestUrl({ url, throw: false });
	if (answer.status >= 400) return false;
	const type = answer.headers["content-type"] ?? "image/png";
	return `data:${type};base64,${arrayBufferToBase64(answer.arrayBuffer)}`;
}

async function drawnIn(node: HTMLElement): Promise<void> {
	const until = Date.now() + DRAWN_WAIT_MS;
	await pause(SETTLE_MS);
	while (Date.now() < until && node.querySelector(STILL_LOADING)) await pause(200);
	await pause(SETTLE_MS);
}

function pause(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
