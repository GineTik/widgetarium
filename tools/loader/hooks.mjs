import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import { REPO, isModuleJs, nearestTsconfig, sourceUrlOf } from "./source-path.mjs";
import { isVirtual, virtualSource } from "./virtual-modules.mjs";

const OBSIDIAN_STUB_URL = new URL("./obsidian-stub.mjs", import.meta.url).href;
const TRANSFORMED = { ".ts": "ts", ".tsx": "tsx", ".jsx": "jsx" };
const READ_AS_TEXT = new Set([".md", ".css"]);
const tsconfigText = new Map();

export async function resolve(specifier, context, nextResolve) {
	if (specifier === "obsidian") return { url: OBSIDIAN_STUB_URL, format: "module", shortCircuit: true };
	if (isVirtual(specifier)) return { url: specifier, format: "module", shortCircuit: true };
	const found = sourceUrlOf(specifier, context.parentURL);
	if (found) return { url: found, shortCircuit: true };
	return nextResolve(specifier, context);
}

function tsconfigRawFor(file) {
	const at = nearestTsconfig(file);
	if (!at) return undefined;
	if (!tsconfigText.has(at)) tsconfigText.set(at, fs.readFileSync(at, "utf8"));
	return tsconfigText.get(at);
}

async function transformed(file) {
	const { code } = await transform(fs.readFileSync(file, "utf8"), {
		loader: TRANSFORMED[path.extname(file)],
		format: "esm",
		target: "es2020",
		jsxFactory: "h",
		jsxFragment: "Fragment",
		tsconfigRaw: tsconfigRawFor(file),
		sourcefile: file,
		sourcemap: "inline",
	});
	return code;
}

const isOwnSource = (file) => file.startsWith(REPO) && !file.includes(`${path.sep}node_modules${path.sep}`);

async function ownModuleSource(file) {
	const extension = path.extname(file);
	if (READ_AS_TEXT.has(extension)) return `export default ${JSON.stringify(fs.readFileSync(file, "utf8"))};\n`;
	if (extension in TRANSFORMED) return transformed(file);
	if (extension === ".js" && isModuleJs(file)) return fs.readFileSync(file, "utf8");
	return null;
}

export async function load(url, context, nextLoad) {
	if (isVirtual(url)) return { format: "module", source: await virtualSource(url), shortCircuit: true };
	if (!url.startsWith("file:")) return nextLoad(url, context);
	const file = fileURLToPath(url);
	if (!isOwnSource(file)) return nextLoad(url, context);
	const source = await ownModuleSource(file);
	if (source === null) return nextLoad(url, context);
	return { format: "module", source, shortCircuit: true };
}
