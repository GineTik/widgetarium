import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO = fileURLToPath(new URL("../../", import.meta.url));

type WorkspacePackage = "core" | "kit";
type ExportsMap = ReadonlyMap<string, string>;

const WORKSPACE_FOLDERS: Readonly<Record<WorkspacePackage, string>> = { core: "packages/core", kit: "packages/kit" };
const WORKSPACE_SPECIFIER = /^@widgetarium\/(core|kit)(\/.*)?$/;
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"];
const COMPILED_TO_JS = /\.(js|mjs)$/;
const exportsOf = new Map<WorkspacePackage, ExportsMap>();

export function sourceUrlOf(specifier: string, parentURL: string | undefined): string | null {
	const [bare = "", suffix = ""] = specifier.split(/(?=[?#])/);
	if (isRelative(bare) && !isFromRepoSource(parentURL)) return null;
	const wanted = wantedPath(bare, parentURL);
	if (!wanted || !inRepoSource(wanted)) return null;
	const found = existingSource(wanted);
	if (!found) return null;
	return `${pathToFileURL(found).href}${suffix}`;
}

export function isModuleJs(file: string): boolean {
	return /^(packages|apps)\/[^/]+\/src\//.test(path.relative(REPO, file).split(path.sep).join("/"));
}

export function nearestTsconfig(file: string): string | null {
	for (let at = path.dirname(file); at.startsWith(REPO); at = path.dirname(at)) {
		const candidate = path.join(at, "tsconfig.json");
		if (isFile(candidate)) return candidate;
	}
	return null;
}

const isFile = (at: string): boolean => fs.statSync(at, { throwIfNoEntry: false })?.isFile() ?? false;
const inRepoSource = (at: string): boolean => at.startsWith(REPO) && !at.includes(`${path.sep}node_modules${path.sep}`);
const isRelative = (specifier: string): boolean => specifier.startsWith("./") || specifier.startsWith("../");
const isFromRepoSource = (parentURL: string | undefined): boolean =>
	parentURL?.startsWith("file:") === true && inRepoSource(fileURLToPath(parentURL));
const isWorkspacePackage = (name: string | undefined): name is WorkspacePackage => name === "core" || name === "kit";

function packageExports(name: WorkspacePackage): ExportsMap {
	const held = exportsOf.get(name);
	if (held) return held;
	const manifest: unknown = JSON.parse(
		fs.readFileSync(path.join(REPO, WORKSPACE_FOLDERS[name], "package.json"), "utf8"),
	);
	const read = stringExportsIn(manifest);
	exportsOf.set(name, read);
	return read;
}

function stringExportsIn(manifest: unknown): ExportsMap {
	if (typeof manifest !== "object" || manifest === null || !("exports" in manifest)) return new Map();
	const { exports } = manifest;
	if (typeof exports !== "object" || exports === null) return new Map();
	return new Map(
		Object.entries(exports).flatMap(([key, target]: [string, unknown]) =>
			typeof target === "string" ? [[key, target] as const] : [],
		),
	);
}

function exportTarget(exports: ExportsMap, subpath: string): string | null {
	const key = `.${subpath}`;
	const exact = exports.get(key);
	if (exact !== undefined) return exact;
	for (const [pattern, target] of exports) {
		const [before = "", after, extra] = pattern.split("*");
		if (after === undefined || extra !== undefined) continue;
		if (!key.startsWith(before) || !key.endsWith(after) || key.length < before.length + after.length) continue;
		return target.replace("*", key.slice(before.length, key.length - after.length));
	}
	return null;
}

function workspacePath(specifier: string): string | null {
	const named = WORKSPACE_SPECIFIER.exec(specifier);
	const name = named?.[1];
	if (!isWorkspacePackage(name)) return null;
	const target = exportTarget(packageExports(name), named?.[2] ?? "");
	if (!target) return null;
	return path.join(REPO, WORKSPACE_FOLDERS[name], target);
}

function wantedPath(specifier: string, parentURL: string | undefined): string | null {
	if (isRelative(specifier)) {
		if (!parentURL) return null;
		return path.resolve(path.dirname(fileURLToPath(parentURL)), specifier);
	}
	if (specifier.startsWith("file:")) return fileURLToPath(specifier);
	if (specifier.startsWith("/")) return specifier;
	return workspacePath(specifier);
}

function existingSource(wanted: string): string | null {
	if (isFile(wanted)) return wanted;
	const stem = wanted.replace(COMPILED_TO_JS, "");
	const tried = [
		...SOURCE_EXTENSIONS.map((extension) => `${stem}${extension}`),
		...SOURCE_EXTENSIONS.map((extension) => path.join(wanted, `index${extension}`)),
	];
	return tried.find(isFile) ?? null;
}
