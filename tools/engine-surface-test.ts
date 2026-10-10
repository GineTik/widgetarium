import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { API, type Project } from "typescript/unstable/sync";
import { fieldOf, isNodeExport, sourceOfExport } from "./export-source.mts";

interface SurfacePair {
	readonly shipped: string;
	readonly typedAgainst: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const CORE = path.join(REPO, "packages/core");
const SDK_SURFACE = path.join(REPO, "packages/sdk/types/widgetarium.d.ts");
const WIDGET_API_ENTRY = ".";
const PROBE = "probe.ts";
const PROBE_OPTIONS = {
	target: "ES2022",
	module: "ESNext",
	moduleResolution: "bundler",
	customConditions: ["source"],
	lib: ["ES2023", "DOM", "DOM.Iterable"],
	jsx: "react",
	jsxFactory: "h",
	jsxFragmentFactory: "Fragment",
	strict: true,
	noEmit: true,
	allowImportingTsExtensions: true,
	skipLibCheck: true,
	types: [],
};

function exportSourcesOf(folder: string): Map<string, string> {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8"));
	const exports = fieldOf(manifest, "exports");
	const entries = typeof exports === "object" && exports !== null ? Object.entries(exports) : [];
	return new Map(
		entries.flatMap(([subpath, target]) => {
			if (isNodeExport(target)) return [];
			const source = sourceOfExport(target);
			return source === null ? [] : [[subpath, path.join(folder, source)]];
		}),
	);
}

function surfacePairs(): SurfacePair[] {
	const shipped = exportSourcesOf(CORE).get(WIDGET_API_ENTRY);
	if (shipped === undefined) throw new Error("packages/core exports no widget API entry");
	return [{ shipped, typedAgainst: SDK_SURFACE }];
}

function probeText(modules: readonly string[]): string {
	return modules.map((at, index) => `import type * as surface${index} from ${JSON.stringify(at)};\n`).join("");
}

function writeProbe(modules: readonly string[]): string {
	const folder = fs.mkdtempSync(path.join(os.tmpdir(), "wg-engine-surface-"));
	fs.writeFileSync(path.join(folder, PROBE), probeText(modules));
	fs.writeFileSync(
		path.join(folder, "tsconfig.json"),
		JSON.stringify({ compilerOptions: PROBE_OPTIONS, files: [PROBE] }),
	);
	return folder;
}

function exportNamesOf(project: Project, probe: string, module: string): Set<string> {
	const at = fs.readFileSync(probe, "utf8").indexOf(JSON.stringify(module)) + 1;
	const symbol = project.checker.getSymbolAtPosition(probe, at);
	if (symbol === undefined) throw new Error(`the probe resolved no module for ${module}`);
	return new Set(project.checker.getExportsOfModule(symbol).map(({ name }) => name));
}

function driftOf(pair: SurfacePair, names: (module: string) => ReadonlySet<string>): string[] {
	const shipped = names(pair.shipped);
	const typedAgainst = names(pair.typedAgainst);
	const shippedName = path.relative(REPO, pair.shipped);
	const typedName = path.relative(REPO, pair.typedAgainst);
	if (shipped.size === 0) return [`${shippedName} exports nothing`];
	return [
		...[...shipped]
			.filter((name) => !typedAgainst.has(name))
			.map((name) => `${name}: in ${shippedName}, not in ${typedName}`),
		...[...typedAgainst]
			.filter((name) => !shipped.has(name))
			.map((name) => `${name}: in ${typedName}, not in ${shippedName}`),
	];
}

function probeProjectIn(api: API, folder: string): Project {
	const [project] = api.updateSnapshot({ openProjects: [path.join(folder, "tsconfig.json")] }).getProjects();
	if (project === undefined) throw new Error("the probe project did not open");
	return project;
}

function surfaceDrift(pairs: readonly SurfacePair[]): string[] {
	const folder = writeProbe(pairs.flatMap(({ shipped, typedAgainst }) => [shipped, typedAgainst]));
	const api = new API({ cwd: folder });
	try {
		const project = probeProjectIn(api, folder);
		const probe = path.join(folder, PROBE);
		const unresolved = project.program.getSemanticDiagnostics(probe).map(({ text }) => `probe: ${text}`);
		return [
			...unresolved,
			...pairs.flatMap((pair) => driftOf(pair, (module) => exportNamesOf(project, probe, module))),
		];
	} finally {
		api.close();
		fs.rmSync(folder, { recursive: true, force: true });
	}
}

const pairs = surfacePairs();
const drifted = surfaceDrift(pairs);
for (const line of drifted) console.log(`fail  ${line}`);
console.log(
	drifted.length
		? `engine surface gate: ${drifted.length} name(s) drifted`
		: `engine surface gate: clean, ${pairs.length} entries export what they are typed against`,
);
if (drifted.length) process.exit(1);
