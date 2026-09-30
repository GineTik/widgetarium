import { transform } from "sucrase";
import type { Transform } from "sucrase";

export type FolderFiles = Readonly<Record<string, string>>;

export interface FolderListing {
	readonly files: readonly string[];
	readonly folders: readonly string[];
}

export type ListFolder = (at: string) => Promise<FolderListing>;

const BUILD_DIR = "build";
export const BUILD_FILE = "widget.js";
const BUILT_SHEET = "widget.css";
export const SOURCE_FILES: readonly string[] = ["widget.tsx", "widget.ts"];
export const JAVASCRIPT_SOURCE_FILES: readonly string[] = ["widget.jsx", "widget.js"];
export const EVERY_SOURCE_FILE: readonly string[] = [...SOURCE_FILES, ...JAVASCRIPT_SOURCE_FILES];
export const SHEET_FILES: readonly string[] = ["widget.css", "styles.css"];
export const LIB_FILES: readonly string[] = ["lib.ts", "lib.tsx", "lib.js"];

const NEVER_WALKED: readonly string[] = [BUILD_DIR, "node_modules"];
const TYPED_TRANSFORMS: Transform[] = ["typescript", "jsx", "imports"];
const UNTYPED_TRANSFORMS: Transform[] = ["jsx", "imports"];

const JAVASCRIPT_REFUSED =
	'{folder}/{file} is JavaScript, and a widget is written in TypeScript. Rename it to widget.tsx — JavaScript is valid TypeScript, so the rename alone is enough to build it: mv "{folder}/{file}" "{folder}/widget.tsx"';

export function libFileIn(names: readonly string[]): string | null {
	return LIB_FILES.find((name) => names.includes(name)) ?? null;
}

export function importsScopeLib(files: FolderFiles, scopeName: string): boolean {
	const quoted = [`"${scopeName}/lib"`, `'${scopeName}/lib'`];
	return modulesIn(files).some((name) => quoted.some((spec) => String(files[name]).includes(spec)));
}

export function javascriptSourceRefusal(names: readonly string[], folder: string): string | null {
	if (names.some((name) => SOURCE_FILES.includes(name))) return null;
	const file = names.find((name) => JAVASCRIPT_SOURCE_FILES.includes(name));
	if (!file) return null;
	return JAVASCRIPT_REFUSED.replace(/\{(folder|file)\}/g, (_placeholder, key: string) =>
		key === "folder" ? folder : file,
	);
}

export function missingSourceRefusal(names: readonly string[], folder: string): string {
	return javascriptSourceRefusal(names, folder) ?? `${folder} holds no widget source`;
}

export function buildFolder(folder: string): string {
	return `${folder}/${BUILD_DIR}`;
}

export function builtCodePath(folder: string): string {
	return `${buildFolder(folder)}/${BUILD_FILE}`;
}

export function builtSheetPath(folder: string): string {
	return `${buildFolder(folder)}/${BUILT_SHEET}`;
}

export function compileWidget(source: string, filePath: string): string {
	const typed = /\.tsx?$/.test(filePath);
	return transform(source, {
		transforms: typed ? TYPED_TRANSFORMS : UNTYPED_TRANSFORMS,
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath,
	}).code;
}

export function sourceFileIn(files: Readonly<Record<string, unknown>> | null | undefined): string | null {
	return SOURCE_FILES.find((name) => typeof files?.[name] === "string") ?? null;
}

export function isWidgetModule(name: string): boolean {
	return /\.tsx?$/.test(name) && !name.endsWith(".d.ts") && !name.startsWith(`${BUILD_DIR}/`);
}

export function modulesIn(files: Readonly<Record<string, unknown>> | null | undefined): string[] {
	return Object.keys(files ?? {})
		.filter(isWidgetModule)
		.sort();
}

export async function widgetModulesUnder(folder: string, list: ListFolder, under = ""): Promise<string[]> {
	const at = under === "" ? folder : `${folder}/${under}`;
	const held = await list(at);
	const named = (full: string): string => `${under === "" ? "" : `${under}/`}${full.slice(at.length + 1)}`;
	const found = held.files.map(named).filter(isWidgetModule);
	for (const inner of held.folders.map(named)) {
		if (!NEVER_WALKED.includes(inner.slice(inner.lastIndexOf("/") + 1)))
			found.push(...(await widgetModulesUnder(folder, list, inner)));
	}
	return found.sort();
}

export function compileWidgetFolder(files: FolderFiles, folder: string): string {
	const entry = sourceFileIn(files);
	if (entry === null) throw new Error(missingSourceRefusal(Object.keys(files), folder));
	const modules = modulesIn(files);
	if (modules.length <= 1) return compileWidget(sourceOf(files, entry), `${folder}/${entry}`);
	const compiled = modules.map(
		(name) =>
			`${JSON.stringify(name)}: function (require, module, exports) {\n${compileWidget(sourceOf(files, name), `${folder}/${name}`)}\n}`,
	);
	return FOLDER_LOADER.replace("{entry}", JSON.stringify(entry)).replace("{modules}", () => compiled.join(",\n"));
}

function sourceOf(files: FolderFiles, name: string): string {
	return files[name] ?? "";
}

const FOLDER_LOADER = `const widgetModules = {
{modules}
};
const widgetOuterRequire = require;
const widgetLoaded = {};
function widgetResolved(from, spec) {
	const base = from.split("/").slice(0, -1);
	for (const part of spec.split("/")) {
		if (part === "..") base.pop();
		else if (part !== ".") base.push(part);
	}
	const path = base.join("/");
	const found = [path, path + ".ts", path + ".tsx", path + "/index.ts", path + "/index.tsx"].find((name) => name in widgetModules);
	if (!found) throw new Error("cannot import " + JSON.stringify(spec) + " from " + from);
	return found;
}
function widgetLoad(name) {
	if (widgetLoaded[name]) return widgetLoaded[name].exports;
	const held = { exports: {} };
	widgetLoaded[name] = held;
	const localRequire = (spec) => (spec.startsWith(".") ? widgetLoad(widgetResolved(name, spec)) : widgetOuterRequire(spec));
	widgetModules[name](localRequire, held, held.exports);
	return held.exports;
}
module.exports = widgetLoad({entry});`;
