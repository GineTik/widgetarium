import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";

const RESOLVED_AS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

export function runWidgetSource(file, outerRequire, h, Fragment, loaded = new Map()) {
	if (loaded.has(file)) return loaded.get(file).exports;
	const shell = { exports: {} };
	loaded.set(file, shell);
	const siblingRequire = (name) =>
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

export function widgetModuleSources(folder) {
	const sources = {};
	const walk = (at) => {
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

function compiledSource(file) {
	return transform(fs.readFileSync(file, "utf8"), {
		transforms: /\.tsx?$/.test(file) ? ["typescript", "jsx", "imports"] : ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath: file,
	}).code;
}

function siblingOf(file, name) {
	const base = path.join(path.dirname(file), name);
	const found = RESOLVED_AS.map((suffix) => base + suffix).find(
		(candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
	);
	if (!found) throw new Error(`cannot import "${name}" from ${file}`);
	return found;
}
