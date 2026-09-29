import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO = fileURLToPath(new URL("../../", import.meta.url));

const WORKSPACE_PACKAGES = { core: "packages/core", kit: "packages/kit" };
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const COMPILED_TO_JS = /\.(js|mjs)$/;
const exportsOf = new Map();

const isFile = (at) => fs.statSync(at, { throwIfNoEntry: false })?.isFile() ?? false;
const inRepoSource = (at) => at.startsWith(REPO) && !at.includes(`${path.sep}node_modules${path.sep}`);

function packageExports(name) {
	if (!exportsOf.has(name)) {
		const held = JSON.parse(fs.readFileSync(path.join(REPO, WORKSPACE_PACKAGES[name], "package.json"), "utf8"));
		exportsOf.set(name, held.exports);
	}
	return exportsOf.get(name);
}

function exportTarget(exports, subpath) {
	const key = `.${subpath}`;
	if (typeof exports[key] === "string") return exports[key];
	for (const [pattern, target] of Object.entries(exports)) {
		const [before, after, extra] = pattern.split("*");
		if (after === undefined || extra !== undefined) continue;
		if (!key.startsWith(before) || !key.endsWith(after) || key.length < before.length + after.length) continue;
		return target.replace("*", key.slice(before.length, key.length - after.length));
	}
	return null;
}

function workspacePath(specifier) {
	const named = /^@widgetarium\/(core|kit)(\/.*)?$/.exec(specifier);
	if (!named) return null;
	const target = exportTarget(packageExports(named[1]), named[2] ?? "");
	if (!target) return null;
	return path.join(REPO, WORKSPACE_PACKAGES[named[1]], target);
}

function wantedPath(specifier, parentURL) {
	if (specifier.startsWith("./") || specifier.startsWith("../")) {
		return path.resolve(path.dirname(fileURLToPath(parentURL)), specifier);
	}
	if (specifier.startsWith("file:")) return fileURLToPath(specifier);
	if (specifier.startsWith("/")) return specifier;
	return workspacePath(specifier);
}

function existingSource(wanted) {
	if (isFile(wanted)) return wanted;
	const stem = wanted.replace(COMPILED_TO_JS, "");
	const tried = [
		...SOURCE_EXTENSIONS.map((extension) => `${stem}${extension}`),
		...SOURCE_EXTENSIONS.map((extension) => path.join(wanted, `index${extension}`)),
	];
	return tried.find(isFile) ?? null;
}

export function sourceUrlOf(specifier, parentURL) {
	const [bare, suffix = ""] = specifier.split(/(?=[?#])/);
	const relative = bare.startsWith("./") || bare.startsWith("../");
	if (relative && !(parentURL?.startsWith("file:") && inRepoSource(fileURLToPath(parentURL)))) return null;
	const wanted = wantedPath(bare, parentURL);
	if (!wanted || !inRepoSource(wanted)) return null;
	const found = existingSource(wanted);
	if (!found) return null;
	return `${pathToFileURL(found).href}${suffix}`;
}

export function isModuleJs(file) {
	return /^(packages|apps)\/[^/]+\/src\//.test(path.relative(REPO, file).split(path.sep).join("/"));
}

export function nearestTsconfig(file) {
	for (let at = path.dirname(file); at.startsWith(REPO); at = path.dirname(at)) {
		const candidate = path.join(at, "tsconfig.json");
		if (isFile(candidate)) return candidate;
	}
	return null;
}
