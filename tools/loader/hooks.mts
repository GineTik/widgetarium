import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LoadFnOutput, LoadHookSync, ResolveHookSync } from "node:module";
import { transformSync, type Loader } from "esbuild";
import { REPO, isModuleJs, nearestTsconfig, sourceUrlOf } from "./source-path.mts";
import { isVirtual, virtualSource } from "./virtual-modules.mts";

const OBSIDIAN_STUB_URL = new URL("./obsidian-stub.mts", import.meta.url).href;
const TRANSFORMED: ReadonlyMap<string, Loader> = new Map([
	[".ts", "ts"],
	[".tsx", "tsx"],
	[".jsx", "jsx"],
]);
const READ_AS_TEXT = new Set([".md", ".css"]);
const TOOLS = path.join(REPO, "tools") + path.sep;
const tsconfigText = new Map<string, string>();

export const resolve: ResolveHookSync = (specifier, context, nextResolve) => {
	if (specifier === "obsidian") return { url: OBSIDIAN_STUB_URL, format: "module-typescript", shortCircuit: true };
	if (isVirtual(specifier)) return { url: specifier, format: "module", shortCircuit: true };
	const found = sourceUrlOf(specifier, context.parentURL);
	if (found) return { url: found, shortCircuit: true };
	return nextResolve(specifier, context);
};

export const load: LoadHookSync = (url, context, nextLoad) => {
	if (isVirtual(url)) return moduleOf(virtualSource(url));
	if (!url.startsWith("file:")) return nextLoad(url, context);
	const file = fileURLToPath(url);
	if (!isOwnSource(file)) return nextLoad(url, context);
	const source = ownModuleSource(file);
	if (source === null) return nextLoad(url, context);
	return moduleOf(source);
};

const moduleOf = (source: string): LoadFnOutput => ({ format: "module", source, shortCircuit: true });

function tsconfigRawFor(file: string): string | undefined {
	const at = nearestTsconfig(file);
	if (!at) return undefined;
	const held = tsconfigText.get(at);
	if (held !== undefined) return held;
	const read = fs.readFileSync(at, "utf8");
	tsconfigText.set(at, read);
	return read;
}

const targetOf = (file: string): string => (file.startsWith(TOOLS) ? "es2022" : "es2020");

function transformed(file: string, loader: Loader): string {
	const tsconfigRaw = tsconfigRawFor(file);
	const { code } = transformSync(fs.readFileSync(file, "utf8"), {
		loader,
		format: "esm",
		target: targetOf(file),
		jsxFactory: "h",
		jsxFragment: "Fragment",
		...(tsconfigRaw === undefined ? {} : { tsconfigRaw }),
		sourcefile: file,
		sourcemap: "inline",
	});
	return code;
}

const isOwnSource = (file: string): boolean =>
	file.startsWith(REPO) && !file.includes(`${path.sep}node_modules${path.sep}`);

function ownModuleSource(file: string): string | null {
	const extension = path.extname(file);
	if (READ_AS_TEXT.has(extension)) return `export default ${JSON.stringify(fs.readFileSync(file, "utf8"))};\n`;
	const loader = TRANSFORMED.get(extension);
	if (loader) return transformed(file, loader);
	if (extension === ".js" && isModuleJs(file)) return fs.readFileSync(file, "utf8");
	return null;
}
