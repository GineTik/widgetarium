import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import esbuild, { type Plugin } from "esbuild";
import { TEXT_LOADERS } from "../apps/obsidian/build.mts";
import { z } from "zod";
import { SOURCE_CONDITION, fieldOf, sourceOfExport } from "./export-source.mts";

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
	"packages/widgetarium",
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
const PACKAGES_ROOT = path.join(REPO, "packages");
const INTERNAL_PACKAGE = /^(?:widgetarium|@widgetarium\/.+)$/;
const BUILT_TO = "dist";
const SOURCE_FOLDER = "src";
const KIT_THEME = /^@widgetarium\/kit\/theme\.css$/;
const ENTRY_SOURCE = /\.tsx?$/;
const DECLARATION = /\.d\.ts$/;

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
	for (const folder of folders) {
		copyHandWrittenDeclarations(folder, builtIn(folder));
		emitDeclarations(folder, builtIn(folder));
	}
}

const builtIn = (folder: string): string => path.join(folder, BUILT_TO);

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
	for (const built of builtFoldersUnder(PACKAGES_ROOT)) fs.rmSync(built, { recursive: true, force: true });
}

function builtFoldersUnder(at: string): string[] {
	return fs
		.readdirSync(at, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name !== "node_modules")
		.flatMap((entry) => {
			const inside = path.join(at, entry.name);
			return entry.name === BUILT_TO ? [inside] : builtFoldersUnder(inside);
		});
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

function entrySourcesOf(folder: string): string[] {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8"));
	const exports = fieldOf(manifest, "exports");
	const targets = typeof exports === "object" && exports !== null ? Object.values(exports) : [];
	const sources = targets.flatMap((target) => {
		const source = sourceOfExport(target);
		return source === null ? [] : sourcesMatching(folder, source);
	});
	return [...new Set(sources)];
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
