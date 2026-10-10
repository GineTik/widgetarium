import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import esbuild, { type Plugin } from "esbuild";
import { TEXT_LOADERS } from "../apps/obsidian/build.mts";
import { z } from "zod";
import { SOURCE_CONDITION, fieldOf, isNodeExport, sourceOfExport } from "./export-source.mts";
import { studioSplitOf } from "./studio-sheet.mts";

export interface PackedPackage {
	readonly name: string;
	readonly version: string;
	readonly tarball: string;
}

export const REPO = path.resolve(import.meta.dirname, "..");
export const PACKED_INTO = path.join(REPO, "dist-packages");
export const ENGINE_PACKAGES: readonly string[] = [
	"packages/kit",
	"packages/core",
	"packages/packs/core",
	"packages/packs/obsidian",
	"packages/packs/stats",
	"packages/packs/git",
	"packages/packs/catalogue",
	"apps/studio",
	"packages/vite",
	"packages/cli",
];

const NpmPackAnswerSchema = z.tuple([z.object({ name: z.string(), version: z.string(), filename: z.string() })]);
const DependenciesSchema = z.record(z.string(), z.string()).optional();
const PackageManifestSchema = z.object({
	name: z.string(),
	version: z.string(),
	dependencies: DependenciesSchema,
	peerDependencies: DependenciesSchema,
	optionalDependencies: DependenciesSchema,
});
type PackageManifest = z.infer<typeof PackageManifestSchema>;
const INTERNAL_PACKAGE = /^@widgetarium\/.+$/;
const BUILT_TO = "dist";
const SOURCE_FOLDER = "src";
const KIT_THEME = /^@widgetarium\/kit\/theme\.css$/;
const ENTRY_SOURCE = /\.tsx?$/;
const DECLARATION = /\.d\.ts$/;
const NODE_TARGET = "node20";
const BUILT_BIN = /^\.\/dist\/(.+)\.js$/;
const HANDBOOK = { from: path.join(REPO, "docs/ai"), into: path.join(REPO, "packages/cli/dist/handbook") };
const BROWSER_STYLES = {
	host: path.join(REPO, "packages/core/browser-host.css"),
	board: path.join(REPO, "apps/obsidian/styles.css"),
	into: path.join(REPO, "packages/core/dist/styles.css"),
	studioInto: path.join(REPO, "apps/studio/dist/studio.css"),
};

export async function packEngine(): Promise<PackedPackage[]> {
	const folders = ENGINE_PACKAGES.map((folder) => path.join(REPO, folder));
	refuseDriftedSiblingVersions(folders.map(manifestIn));
	clearBuilds();
	fs.rmSync(PACKED_INTO, { recursive: true, force: true });
	fs.mkdirSync(PACKED_INTO, { recursive: true });
	try {
		await buildEach(folders);
		return folders.map(npmPack);
	} finally {
		clearBuilds();
	}
}

async function buildEach(folders: readonly string[]): Promise<void> {
	for (const folder of folders) await bundleEntries(folder, builtIn(folder));
	for (const folder of folders) await bundleNodeEntries(folder, builtIn(folder));
	fs.cpSync(HANDBOOK.from, HANDBOOK.into, { recursive: true });
	writeBrowserStyles();
	for (const folder of folders) {
		copyHandWrittenDeclarations(folder, builtIn(folder));
		emitDeclarations(folder, builtIn(folder));
	}
}

const builtIn = (folder: string): string => path.join(folder, BUILT_TO);

// TRADE-OFF: the engine package's sheet is cut from the app's styles.css; moving that owner into core touches every paint gate
function writeBrowserStyles(): void {
	const sheets = [BROWSER_STYLES.host, BROWSER_STYLES.board].map((at) => fs.readFileSync(at, "utf8"));
	const { app, studio } = studioSplitOf(sheets.join("\n"));
	fs.writeFileSync(BROWSER_STYLES.into, app);
	fs.writeFileSync(BROWSER_STYLES.studioInto, studio);
}

function manifestIn(folder: string): PackageManifest {
	return PackageManifestSchema.parse(JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8")));
}

function refuseDriftedSiblingVersions(manifests: readonly PackageManifest[]): void {
	const siblings = new Map(manifests.map(({ name, version }) => [name, version]));
	const drifted = manifests.flatMap((manifest) =>
		internalDependenciesOf(manifest)
			.filter(([dependency, range]) => siblings.get(dependency) !== range)
			.map(
				([dependency, range]) =>
					`${manifest.name} asks for ${dependency}@${range}, the sibling is ${siblings.get(dependency) ?? "not packed"}`,
			),
	);
	if (drifted.length > 0) throw new Error(`engine packages disagree on versions:\n${drifted.join("\n")}`);
}

function internalDependenciesOf(manifest: PackageManifest): [string, string][] {
	const declared = [manifest.dependencies, manifest.peerDependencies, manifest.optionalDependencies];
	return declared
		.flatMap((held) => Object.entries(held ?? {}))
		.filter(([dependency]) => INTERNAL_PACKAGE.test(dependency));
}

function clearBuilds(): void {
	for (const folder of ENGINE_PACKAGES) fs.rmSync(builtIn(path.join(REPO, folder)), { recursive: true, force: true });
}

async function bundleEntries(folder: string, built: string): Promise<void> {
	await esbuild.build({
		entryPoints: entrySourcesOf(folder),
		outdir: built,
		outbase: path.join(folder, SOURCE_FOLDER),
		bundle: true,
		splitting: true,
		format: "esm",
		platform: "browser",
		target: "es2020",
		packages: "external",
		conditions: [SOURCE_CONDITION],
		loader: TEXT_LOADERS,
		jsxFactory: "h",
		jsxFragment: "Fragment",
		plugins: [kitThemeInlined()],
		logLevel: "warning",
	});
}

async function bundleNodeEntries(folder: string, built: string): Promise<void> {
	const entryPoints = [...nodeExportSourcesOf(folder), ...binSourcesOf(folder)];
	if (entryPoints.length === 0) return;
	await esbuild.build({
		entryPoints,
		outdir: built,
		outbase: path.join(folder, SOURCE_FOLDER),
		bundle: true,
		format: "esm",
		platform: "node",
		target: NODE_TARGET,
		packages: "external",
		conditions: [SOURCE_CONDITION],
		logLevel: "warning",
	});
}

function exportTargetsOf(folder: string): unknown[] {
	const exports = fieldOf(rawManifestIn(folder), "exports");
	return typeof exports === "object" && exports !== null ? Object.values(exports) : [];
}

function rawManifestIn(folder: string): unknown {
	return JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8"));
}

function entrySourcesOf(folder: string): string[] {
	const browserTargets = exportTargetsOf(folder).filter((target) => !isNodeExport(target));
	return [...new Set(browserTargets.flatMap((target) => sourcesOfTarget(folder, target)))];
}

function nodeExportSourcesOf(folder: string): string[] {
	return exportTargetsOf(folder)
		.filter(isNodeExport)
		.flatMap((target) => sourcesOfTarget(folder, target));
}

function sourcesOfTarget(folder: string, target: unknown): string[] {
	const source = sourceOfExport(target);
	return source === null ? [] : sourcesMatching(folder, source);
}

function binSourcesOf(folder: string): string[] {
	const bin = fieldOf(rawManifestIn(folder), "bin");
	const targets = typeof bin === "object" && bin !== null ? Object.values(bin) : [];
	return targets.map((target) => {
		const built = typeof target === "string" ? BUILT_BIN.exec(target) : null;
		const source = built?.[1] === undefined ? null : path.join(folder, SOURCE_FOLDER, `${built[1]}.ts`);
		if (source === null || !fs.existsSync(source))
			throw new Error(`${folder} ships bin ${String(target)} built from no source`);
		return source;
	});
}

function sourcesMatching(folder: string, source: string): string[] {
	const star = source.indexOf("*");
	if (star < 0) return ENTRY_SOURCE.test(source) ? [path.join(folder, source)] : [];
	return sourceFilesUnder(path.join(folder, source.slice(0, star)));
}

function sourceFilesUnder(at: string): string[] {
	return fs
		.readdirSync(at, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && ENTRY_SOURCE.test(entry.name) && !DECLARATION.test(entry.name))
		.map((entry) => path.join(entry.parentPath, entry.name));
}

function kitThemeInlined(): Plugin {
	return {
		name: "widgetarium-kit-theme-inlined",
		setup(build) {
			build.onResolve({ filter: KIT_THEME }, () => ({ path: path.join(REPO, "packages/kit/theme.css") }));
		},
	};
}

function emitDeclarations(folder: string, built: string): void {
	const configAt = fs.mkdtempSync(path.join(os.tmpdir(), "wg-pack-"));
	try {
		const config = path.join(configAt, "tsconfig.json");
		fs.writeFileSync(config, JSON.stringify(publishedDeclarationsConfig(folder, built, configAt)));
		execFileSync("npx", ["--no-install", "tsc", "-p", config], { cwd: REPO, stdio: "inherit" });
	} finally {
		fs.rmSync(configAt, { recursive: true, force: true });
	}
}

function publishedDeclarationsConfig(folder: string, built: string, configAt: string): object {
	return {
		extends: path.join(folder, "tsconfig.json"),
		compilerOptions: {
			customConditions: [],
			typeRoots: [path.join(REPO, "node_modules/@types")],
			composite: false,
			noEmit: false,
			declaration: true,
			emitDeclarationOnly: true,
			rootDir: path.join(folder, SOURCE_FOLDER),
			outDir: built,
			tsBuildInfoFile: path.join(configAt, "pack.tsbuildinfo"),
		},
	};
}

function copyHandWrittenDeclarations(folder: string, built: string): void {
	const sources = path.join(folder, SOURCE_FOLDER);
	for (const entry of fs.readdirSync(sources, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile() || !DECLARATION.test(entry.name)) continue;
		const from = path.join(entry.parentPath, entry.name);
		const to = path.join(built, path.relative(sources, from));
		fs.mkdirSync(path.dirname(to), { recursive: true });
		fs.copyFileSync(from, to);
	}
}

function npmPack(folder: string): PackedPackage {
	const said = execFileSync("npm", ["pack", folder, "--pack-destination", PACKED_INTO, "--json", "--ignore-scripts"], {
		cwd: REPO,
		encoding: "utf8",
	});
	const [{ name, version, filename }] = NpmPackAnswerSchema.parse(JSON.parse(said));
	return { name, version, tarball: path.join(PACKED_INTO, filename) };
}

if (import.meta.main) {
	for (const { name, version, tarball } of await packEngine()) console.log(`${name}@${version}  ${tarball}`);
}
