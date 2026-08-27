import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";

const VAULT = process.env.WG_VAULT ?? "/Users/denissevcuk/Documents/Obsidian/Personal/Personal";
const NOTES = process.argv.slice(2);

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "ResizeObserver", "requestAnimationFrame"]) {
	globalThis[key] = key === "ResizeObserver"
		? class { observe() {} disconnect() {} }
		: key === "window"
			? dom.window
			: dom.window[key];
}
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

import { buildMirror } from "./mirror.mjs";

buildMirror();

const { h, render } = await import("preact");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");

const adapter = {
	exists: async (p) => fs.existsSync(path.join(VAULT, p)),
	list: async (p) => {
		const full = path.join(VAULT, p);
		const entries = fs.readdirSync(full, { withFileTypes: true });
		return {
			folders: entries.filter((e) => e.isDirectory()).map((e) => `${p}/${e.name}`),
			files: entries.filter((e) => e.isFile()).map((e) => `${p}/${e.name}`),
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
		const draw = (editing) => {
			render(null, target);
			render(h(WidgetSurface, { board, registry, host, editing, onChange() {}, onToggleEditing() {}, screen: true }), target);
			return {
				tiles: target.querySelectorAll(".wg-tile").length,
				cells: target.querySelectorAll(".wg-cells i").length,
				blank: target.querySelector(".wg-blank"),
				gridStyle: target.querySelector(".wg-grid")?.getAttribute("style") ?? "<no .wg-grid>",
			};
		};
		const readingPass = draw(false);
		const editingPass = draw(true);
		// INVARIANT: a tile never draws outside the board, at any column count
		const grid = target.querySelector(".wg-grid");
		const boardWidth = parseFloat(grid?.style.width ?? "0");
		for (const tile of target.querySelectorAll(".wg-tile")) {
			const left = parseFloat(tile.style.transform?.match(/translate3d\(([-\d.]+)px/)?.[1] ?? "0");
			const wide = parseFloat(tile.style.width ?? "0");
			if (left + wide > boardWidth + 0.5) {
				throw new Error(`tile overflows the board by ${(left + wide - boardWidth).toFixed(0)}px`);
			}
		}
		// the grid backdrop is an editing affordance: it may not cost a node while reading
		if (readingPass.cells !== 0) throw new Error(`${readingPass.cells} grid cells leaked into reading mode`);
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
