// The two bugs that killed every board were a missing import each. Nothing failed at build
// time, because an undefined identifier is only an error when the line runs. Importing every
// module catches the ones that break on load; the adapter and interact suites cover the rest.
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

const SOURCE_ROOTS = ["packages/kit/src", "packages/core/src", "apps/obsidian/src"];
const ENTRY_PROGRAMS = new Set([path.resolve("apps/obsidian/src/ai/widgets-cli.ts")]);
const isModuleSource = (name) => /\.(js|ts|tsx|jsx)$/.test(name) && !name.endsWith(".d.ts");

const modules = [];
function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full);
		else if (isModuleSource(entry.name) && !ENTRY_PROGRAMS.has(full)) modules.push(full);
	}
}
for (const root of SOURCE_ROOTS) walk(path.resolve(root));

let failed = 0;
for (const file of modules.sort()) {
	const name = path.relative(process.cwd(), file);
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
