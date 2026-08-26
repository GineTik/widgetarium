import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";

const VAULT = process.env.WG_VAULT;
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

// package.json says commonjs, so the ES sources need an .mjs mirror to be imported directly
const CACHE = path.join(process.cwd(), "tools", ".mjs-cache");
fs.rmSync(CACHE, { recursive: true, force: true });
fs.mkdirSync(CACHE, { recursive: true });
for (const file of fs.readdirSync("src").filter((name) => name.endsWith(".js"))) {
	const body = fs.readFileSync(path.join("src", file), "utf8").replace(/from "\.\/([\w-]+)\.js"/g, 'from "./$1.mjs"');
	fs.writeFileSync(path.join(CACHE, file.replace(/\.js$/, ".mjs")), body);
}

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
		render(h(WidgetSurface, { board, registry, host, editing: false, onChange() {}, onToggleEditing() {}, screen: true }), target);
		const tiles = target.querySelectorAll(".wg-tile").length;
		const blank = target.querySelector(".wg-blank");
		console.log(`OK  ${note} — ${board.tiles.length} tiles in model, ${tiles} rendered${blank ? " (blank: " + blank.textContent.slice(0, 60) + ")" : ""}`);
		if (tiles === 0 && !blank) console.log("    html:", target.innerHTML.slice(0, 300));
	} catch (failure) {
		failed += 1;
		console.log(`!!  ${note} — ${failure.message}`);
		console.log(String(failure.stack).split("\n").slice(1, 4).join("\n"));
	}
}
process.exit(failed ? 1 : 0);
