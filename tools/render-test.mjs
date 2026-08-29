import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";

// TRADE-OFF: the real vault, not the fixture — this suite is ABOUT the installation. It reads the
// notes a person actually has and proves every widget they name is installed there, which a
// fixture cannot answer: half those widgets exist only in that vault.
const VAULT = process.env.WG_VAULT ?? "/Users/denissevcuk/Documents/Obsidian/Personal/Personal";
const NOTES = process.argv.slice(2);

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "ResizeObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
	globalThis[key] = key === "ResizeObserver"
		? class { observe() {} disconnect() {} }
		: key === "window"
			? dom.window
			: dom.window[key];
}
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
// jsdom lays nothing out, so every element reports zero width — the board refuses to draw
// at a width it has not measured, which is the guard against authoring a phantom layout
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

import { buildMirror } from "./mirror.mjs";

buildMirror();

const { h, render } = await import("preact");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");

const adapter = {
	exists: async (p) => fs.existsSync(path.join(VAULT, p)),
	list: async (p) => {
		// statSync FOLLOWS symlinks; dirent.isDirectory() does not. A linked widget scope
		// reported as neither folder nor file, so the whole scope was silently skipped and
		// this test counted the resulting "widget not found" placeholders as rendered tiles.
		const names = fs.readdirSync(path.join(VAULT, p));
		const kind = (name) => { try { return fs.statSync(path.join(VAULT, p, name)); } catch { return null; } };
		return {
			folders: names.filter((name) => kind(name)?.isDirectory()).map((name) => `${p}/${name}`),
			files: names.filter((name) => kind(name)?.isFile()).map((name) => `${p}/${name}`),
		};
	},
	read: async (p) => fs.readFileSync(path.join(VAULT, p), "utf8"),
	stat: async () => ({ mtime: 1, size: 1 }),
};

const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();
console.log(`registry: ${registry.list().length} widgets`);

const host = {
	can: { fullscreen: true, subscribe: true },
	slot: () => ({
		binding: { path: "" }, canCreate: false, canUpdate: false, canRemove: false, canSubscribe: false,
		list: async () => ({ rows: [], total: 0 }), describe: async () => [], subscribe: () => () => {},
	}),
	ui: { notify() {}, openNote() {} },
};

let failed = 0;
for (const note of NOTES) {
	const text = fs.readFileSync(path.join(VAULT, note), "utf8");
	const source = text.split("```widgetarium")[1]?.split("```")[0];
	if (!source) { console.log(`${note}: no widgetarium block`); continue; }

	// preact keeps its tree on the container, so every note needs a fresh one
	const target = dom.window.document.createElement("div");
	dom.window.document.querySelector(".view-content").appendChild(target);
	try {
		const board = normalizeBoard(parseYaml(source) ?? []);
		const draw = async (editing) => {
			render(null, target);
			// jsdom fires no ResizeObserver, so the width has to be handed in — the board draws
			// nothing at a width it has not measured, which is the guard against phantom layouts
			render(h(WidgetSurface, { board, registry, host, editing, onChange() {}, onToggleEditing() {}, screen: true, initialWidth: 1280 }), target);
			// the width lands in an effect, and preact runs effects after the paint
			await new Promise((resolve) => setTimeout(resolve, 20));
			// an expanded board renders into a portal outside this element — and only once
			// that same effect has run, so this is read AFTER the wait, not before
			// the previous pass's portal may not have been torn down yet, so take the newest
			const pages = dom.window.document.querySelectorAll(".wg-page");
			const drawn = pages.length ? pages[pages.length - 1] : target;
			return {
				tiles: drawn.querySelectorAll(".wg-tile").length,
				// a placeholder is not a rendered tile; counting it is how a whole missing
				// widget scope passed this test for as long as it did
				missing: [...drawn.querySelectorAll(".wg-tile-missing code")].map((node) => node.textContent),
				// a widget that threw still leaves a tile behind, so counting tiles said the
				// page was fine while every board on it was dead
				crashed: [...drawn.querySelectorAll(".wg-error code")].map((node) => node.textContent),
				cells: drawn.querySelectorAll(".wg-cells i").length,
				blank: drawn.querySelector(".wg-blank"),
				gridStyle: drawn.querySelector(".wg-grid")?.getAttribute("style") ?? "<no .wg-grid>",
				root: drawn,
			};
		};
		const readingPass = await draw(false);
		const editingPass = await draw(true);
		// INVARIANT: a tile never draws outside the board, at any column count
		const grid = editingPass.root.querySelector(".wg-grid");
		const boardWidth = parseFloat(grid?.style.width ?? "0");
		for (const tile of editingPass.root.querySelectorAll(".wg-tile")) {
			const left = parseFloat(tile.style.transform?.match(/translate3d\(([-\d.]+)px/)?.[1] ?? "0");
			const wide = parseFloat(tile.style.width ?? "0");
			if (left + wide > boardWidth + 0.5) {
				throw new Error(`tile "${tile.getAttribute("data-tile")}" overflows the board by ${(left + wide - boardWidth).toFixed(0)}px (left ${left.toFixed(0)} + width ${wide.toFixed(0)} > ${boardWidth.toFixed(0)})`);
			}
		}
		// the grid backdrop is an editing affordance: it may not cost a node while reading
		if (readingPass.cells !== 0) throw new Error(`${readingPass.cells} grid cells leaked into reading mode`);
		if (readingPass.missing.length > 0) throw new Error(`widget not found: ${readingPass.missing.join(", ")}`);
		if (readingPass.crashed.length > 0) throw new Error(`widget crashed: ${readingPass.crashed.join(" | ")}`);
		if (editingPass.cells === 0) throw new Error("editing mode drew no grid cells");
		console.log(
			`OK  ${note} — ${board.tiles.length} tiles in model, ${readingPass.tiles} rendered, ` +
			`cells ${readingPass.cells} reading / ${editingPass.cells} editing` +
			`${editingPass.gridStyle.includes("--wg-columns") ? "" : "  !! missing --wg-columns"}` +
			`${readingPass.blank ? " (blank: " + readingPass.blank.textContent.slice(0, 40) + ")" : ""}`,
		);
	} catch (failure) {
		failed += 1;
		console.log(`!!  ${note} — ${failure.message}`);
		console.log(String(failure.stack).split("\n").slice(1, 4).join("\n"));
	}
}
process.exit(failed ? 1 : 0);
