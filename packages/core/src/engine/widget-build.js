import { transform } from "sucrase";

const BUILD_DIR = "build";
export const BUILD_FILE = "widget.js";
const BUILT_SHEET = "widget.css";
export const SOURCE_FILES = ["widget.tsx", "widget.ts"];
export const JAVASCRIPT_SOURCE_FILES = ["widget.jsx", "widget.js"];
export const EVERY_SOURCE_FILE = [...SOURCE_FILES, ...JAVASCRIPT_SOURCE_FILES];
export const SHEET_FILES = ["widget.css", "styles.css"];

const JAVASCRIPT_REFUSED =
	'{folder}/{file} is JavaScript, and a widget is written in TypeScript. Rename it to widget.tsx — JavaScript is valid TypeScript, so the rename alone is enough to build it: mv "{folder}/{file}" "{folder}/widget.tsx"';

export function javascriptSourceRefusal(names, folder) {
	if (names.some((name) => SOURCE_FILES.includes(name))) return null;
	const file = names.find((name) => JAVASCRIPT_SOURCE_FILES.includes(name));
	if (!file) return null;
	const filled = { folder, file };
	return JAVASCRIPT_REFUSED.replace(/\{(folder|file)\}/g, (placeholder, key) => filled[key]);
}

export function missingSourceRefusal(names, folder) {
	return javascriptSourceRefusal(names, folder) ?? `${folder} holds no widget source`;
}

export function buildFolder(folder) {
	return `${folder}/${BUILD_DIR}`;
}

export function builtCodePath(folder) {
	return `${buildFolder(folder)}/${BUILD_FILE}`;
}

export function builtSheetPath(folder) {
	return `${buildFolder(folder)}/${BUILT_SHEET}`;
}

export function compileWidget(source, filePath) {
	const typed = /\.tsx?$/.test(String(filePath ?? ""));
	return transform(source, {
		transforms: typed ? ["typescript", "jsx", "imports"] : ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath,
	}).code;
}

export function sourceFileIn(files) {
	return SOURCE_FILES.find((name) => typeof files?.[name] === "string") ?? null;
}

export function isWidgetModule(name) {
	return /\.tsx?$/.test(name) && !name.endsWith(".d.ts") && !name.startsWith(`${BUILD_DIR}/`);
}

export function modulesIn(files) {
	return Object.keys(files ?? {})
		.filter(isWidgetModule)
		.sort();
}

export async function widgetModulesUnder(folder, list, under = "") {
	const at = under === "" ? folder : `${folder}/${under}`;
	const held = await list(at);
	const named = (full) => `${under === "" ? "" : `${under}/`}${full.slice(at.length + 1)}`;
	const found = held.files.map(named).filter(isWidgetModule);
	for (const inner of held.folders.map(named)) {
		if (!NEVER_WALKED.includes(inner.slice(inner.lastIndexOf("/") + 1)))
			found.push(...(await widgetModulesUnder(folder, list, inner)));
	}
	return found.sort();
}

const NEVER_WALKED = [BUILD_DIR, "node_modules"];

export function compileWidgetFolder(files, folder) {
	const entry = sourceFileIn(files);
	const modules = modulesIn(files);
	if (modules.length <= 1) return compileWidget(files[entry], `${folder}/${entry}`);
	const compiled = modules.map(
		(name) =>
			`${JSON.stringify(name)}: function (require, module, exports) {\n${compileWidget(files[name], `${folder}/${name}`)}\n}`,
	);
	return FOLDER_LOADER.replace("{entry}", JSON.stringify(entry)).replace("{modules}", () => compiled.join(",\n"));
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
