import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as tailwind from "tailwindcss";
import { buildSheet, candidatesIn, importsTailwind } from "../packages/core/src/engine/tailwind.ts";
import { SYSTEM_SCOPES } from "./system-widget-files.mts";

const REGISTRY = "registry";
const SHEET = "widget.css";
const BUILT_SHEET = "build/widget.css";
const TAILWIND_FOLDER = "node_modules/tailwindcss";
const CODE = /\.tsx?$/;

let failed = 0;

for (const scope of SYSTEM_SCOPES) {
	const scopeFolder = path.join(REGISTRY, scope);
	const scopeCode = codeIn(scopeFolder, false);
	for (const widget of readdirSync(scopeFolder, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
		const folder = path.join(scopeFolder, widget.name);
		const sheetPath = path.join(folder, SHEET);
		if (!existsSync(sheetPath)) continue;
		const sheet = readFileSync(sheetPath, "utf8");
		if (!importsTailwind(sheet)) continue;
		const done = await buildSheet({
			entry: { path: sheetPath, content: sheet, base: folder },
			compiler: tailwind,
			sheetOfTailwind: async (name) => readFileSync(path.join(TAILWIND_FOLDER, name), "utf8"),
			readFile: async (at) => (existsSync(at) ? readFileSync(at, "utf8") : null),
			candidates: candidatesIn(`${scopeCode}\n${codeIn(folder, true)}`),
		});
		if (!done.ok) {
			failed += 1;
			console.error(`!!  ${scope}/${widget.name}: ${done.failure}`);
			continue;
		}
		mkdirSync(path.join(folder, "build"), { recursive: true });
		writeFileSync(path.join(folder, BUILT_SHEET), done.css);
		console.log(`built  ${scope}/${widget.name}  ${done.css.length} bytes`);
	}
}

if (failed > 0) process.exit(1);

function codeIn(folder: string, isDeep: boolean): string {
	return readdirSync(folder, { withFileTypes: true })
		.flatMap((entry) => {
			const at = path.join(folder, entry.name);
			if (entry.isDirectory()) return isDeep && entry.name !== "build" ? [codeIn(at, true)] : [];
			return CODE.test(entry.name) ? [readFileSync(at, "utf8")] : [];
		})
		.join("\n");
}
