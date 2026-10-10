import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CliRefusal } from "./cli-output.js";
import { outputOf, runIn } from "./run-process.js";

export interface EngineTarball {
	readonly name: string;
	readonly version: string;
	readonly file: string;
	readonly dependencies: Readonly<Record<string, string>>;
}

const CLOSURE_SEED_PACKAGES: readonly string[] = ["@widgetarium/cli", "@widgetarium/vite"];
const INTERNAL_PACKAGE = /^@widgetarium\/.+$/;
const TARBALL = /\.tgz$/;
const PACKED_MANIFEST = "package/package.json";
const REPO_PACKED_INTO = "dist-packages";
const VENDOR_FOLDER = "vendor/engine";

const TarballManifestSchema = z.object({
	name: z.string(),
	version: z.string(),
	dependencies: z.record(z.string(), z.string()).default({}),
});

export function engineFolderFor(asked: string | undefined, repo: string | null): string {
	if (asked !== undefined) return path.resolve(asked);
	if (repo === null) throw new CliRefusal("no engine to install: pass --engine <folder holding the engine tarballs>");
	runIn(repo, "npm", ["run", "pack:engine"]);
	return path.join(repo, REPO_PACKED_INTO);
}

export function engineClosureIn(folder: string): EngineTarball[] {
	const byName = uniqueByName(tarballsIn(folder), folder);
	const held = new Map<string, EngineTarball>();
	const pending = [...CLOSURE_SEED_PACKAGES];
	for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
		if (held.has(name)) continue;
		const tarball = tarballNamed(byName, name, folder);
		held.set(name, tarball);
		pending.push(...internalDependenciesOf(tarball, byName, folder));
	}
	return [...held.values()];
}

export function vendorEngine(closure: readonly EngineTarball[], project: string): Record<string, string> {
	const vendor = path.join(project, VENDOR_FOLDER);
	fs.mkdirSync(vendor, { recursive: true });
	return Object.fromEntries(
		closure.map(({ name, file }) => {
			fs.copyFileSync(file, path.join(vendor, path.basename(file)));
			return [name, `file:${VENDOR_FOLDER}/${path.basename(file)}`];
		}),
	);
}

function tarballsIn(folder: string): EngineTarball[] {
	if (!fs.existsSync(folder)) throw new CliRefusal(`the engine folder ${folder} does not exist`);
	return fs
		.readdirSync(folder)
		.filter((name) => TARBALL.test(name))
		.map((name) => tarballAt(path.join(folder, name)));
}

function uniqueByName(tarballs: readonly EngineTarball[], folder: string): Map<string, EngineTarball> {
	const byName = new Map<string, EngineTarball>();
	for (const tarball of tarballs) {
		const held = byName.get(tarball.name);
		if (held !== undefined)
			throw new CliRefusal(`${folder} holds ${tarball.name} twice: ${held.file}, ${tarball.file}`);
		byName.set(tarball.name, tarball);
	}
	return byName;
}

function tarballAt(file: string): EngineTarball {
	const manifest: unknown = JSON.parse(outputOf(path.dirname(file), "tar", ["-xOzf", file, PACKED_MANIFEST]));
	const parsed = TarballManifestSchema.safeParse(manifest);
	if (!parsed.success) throw new CliRefusal(`${file} holds no readable package.json: ${parsed.error.message}`);
	return { ...parsed.data, file };
}

function tarballNamed(byName: ReadonlyMap<string, EngineTarball>, name: string, folder: string): EngineTarball {
	const tarball = byName.get(name);
	if (tarball === undefined) throw new CliRefusal(`${folder} holds no tarball for ${name}`);
	return tarball;
}

function internalDependenciesOf(
	tarball: EngineTarball,
	byName: ReadonlyMap<string, EngineTarball>,
	folder: string,
): string[] {
	const internal = Object.entries(tarball.dependencies).filter(([name]) => INTERNAL_PACKAGE.test(name));
	for (const [name, range] of internal) {
		const version = tarballNamed(byName, name, folder).version;
		if (version !== range)
			throw new CliRefusal(`${tarball.name} asks for ${name}@${range}, ${folder} holds ${version}`);
	}
	return internal.map(([name]) => name);
}
