// The two bugs that killed every board were a missing import each. Nothing failed at build
// time, because an undefined identifier is only an error when the line runs. Importing every
// module catches the ones that break on load; the adapter and interact suites cover the rest.
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

buildMirror();
const cache = path.join(process.cwd(), "tools", ".mjs-cache");

const modules = [];
(function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full);
		else if (entry.name.endsWith(".mjs") && entry.name !== "obsidian.mjs") modules.push(full);
	}
})(cache);

let failed = 0;
for (const file of modules.sort()) {
	const name = path.relative(cache, file);
	try {
		const loaded = await import(file);
		const exported = Object.keys(loaded).length;
		console.log(`OK  ${name} — ${exported} export${exported === 1 ? "" : "s"}`);
	} catch (failure) {
		failed += 1;
		console.log(`!!  ${name} — ${failure.message}`);
	}
}

console.log(failed ? `\n${failed} module${failed === 1 ? "" : "s"} will not load` : "\nevery module loads");
process.exit(failed ? 1 : 0);
