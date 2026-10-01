import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";

export type WidgetExports = Record<string, unknown>;
export type OuterRequire = (name: string) => unknown;

interface ModuleShell {
	exports: WidgetExports;
}

const RESOLVED_AS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

export function runWidgetSource(
	file: string,
	outerRequire: OuterRequire,
	h: unknown,
	Fragment: unknown,
	loaded: Map<string, ModuleShell> = new Map(),
): WidgetExports {
	const held = loaded.get(file);
	if (held) return held.exports;
	const shell: ModuleShell = { exports: {} };
	loaded.set(file, shell);
	const siblingRequire = (name: string): unknown =>
		name.startsWith(".")
			? runWidgetSource(siblingOf(file, name), outerRequire, h, Fragment, loaded)
			: outerRequire(name);
	new Function("require", "module", "exports", "h", "Fragment", compiledSource(file))(
		siblingRequire,
		shell,
		shell.exports,
		h,
		Fragment,
	);
	return shell.exports;
}

export function widgetModuleSources(folder: string): Record<string, string> {
	const sources: Record<string, string> = {};
	const walk = (at: string): void => {
		for (const entry of fs.readdirSync(path.join(folder, at), { withFileTypes: true })) {
			const name = at === "" ? entry.name : `${at}/${entry.name}`;
			if (entry.isDirectory() && entry.name !== "build" && entry.name !== "node_modules") walk(name);
			else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
				sources[name] = fs.readFileSync(path.join(folder, name), "utf8");
		}
	};
	walk("");
	return sources;
}

function compiledSource(file: string): string {
	return transform(fs.readFileSync(file, "utf8"), {
		transforms: /\.tsx?$/.test(file) ? ["typescript", "jsx", "imports"] : ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath: file,
	}).code;
}

function siblingOf(file: string, name: string): string {
	const base = path.join(path.dirname(file), name);
	const found = RESOLVED_AS.map((suffix) => base + suffix).find(
		(candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
	);
	if (!found) throw new Error(`cannot import "${name}" from ${file}`);
	return found;
}
