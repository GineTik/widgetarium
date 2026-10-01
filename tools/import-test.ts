import fs from "node:fs";
import path from "node:path";
import { layJsdomGlobals } from "./jsdom-globals.ts";

class InertResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
const dom = layJsdomGlobals();
Object.assign(globalThis, { ResizeObserver: InertResizeObserver });
Object.assign(dom.window, { ResizeObserver: InertResizeObserver });

const SOURCE_ROOTS = ["packages/kit/src", "packages/core/src", "apps/obsidian/src"];
const ENTRY_PROGRAMS = new Set([path.resolve("apps/obsidian/src/ai/widgets-cli.ts")]);
const isModuleSource = (name: string): boolean => /\.(js|ts|tsx|jsx)$/.test(name) && !name.endsWith(".d.ts");

const modules: string[] = [];
function walk(dir: string): void {
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
		const loaded: object = await import(file);
		const exported = Object.keys(loaded).length;
		console.log(`OK  ${name} — ${exported} export${exported === 1 ? "" : "s"}`);
	} catch (failure) {
		failed += 1;
		console.log(`!!  ${name} — ${failure instanceof Error ? failure.message : String(failure)}`);
	}
}

console.log(failed ? `\n${failed} module${failed === 1 ? "" : "s"} will not load` : "\nevery module loads");
process.exit(failed ? 1 : 0);
