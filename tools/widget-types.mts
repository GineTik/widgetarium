import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = process.cwd();
const HANDED_TO_A_WIDGET = "packages/sdk/types/widgetarium.d.ts";
const WIDGET_OPTIONS = "packages/sdk/tsconfig.widgets.json";
const KIT = "packages/kit";
const CORE = "packages/core";
const DECLARATIONS = "node_modules/.cache/widgetarium";
const REACT_TYPES = ["node_modules/@types/react/index.d.ts", "node_modules/@types/react/jsx-runtime.d.ts"];
const REACT_DOM_TYPES = ["node_modules/@types/react-dom/index.d.ts"];
const LAID_AT = "types";
const PACKAGES_LAID_AT = `${LAID_AT}/node_modules`;
const LAID_ROOTS: readonly (readonly [from: string, to: string])[] = [
	[`${DECLARATIONS}/core-declarations/`, `${LAID_AT}/core/`],
	[`${DECLARATIONS}/kit-declarations/src/`, `${LAID_AT}/kit/`],
	["node_modules/", `${PACKAGES_LAID_AT}/`],
];
const CORE_SOURCES_SEEN_FROM_THE_SDK = "../../core/src/";

interface WidgetOptions {
	readonly compilerOptions: Readonly<Record<string, unknown>>;
}

interface KitEntry {
	readonly subpath: string;
	readonly source: string;
}

interface KitManifest {
	readonly exports: Readonly<Record<string, unknown>>;
}

export function widgetTypeFiles(): Record<string, string> {
	buildDeclarations();
	return { "tsconfig.json": standaloneTsconfig(), ...laidFiles(filesReached()) };
}

function widgetOptions(): WidgetOptions {
	return JSON.parse(fs.readFileSync(WIDGET_OPTIONS, "utf8"));
}

const repoPathOf = (at: string): string => path.relative(REPO, at).split(path.sep).join("/");

function buildDeclarations(): void {
	execFileSync("npx", ["--no-install", "tsc", "-b", KIT, CORE], { stdio: "pipe" });
}

function kitManifest(): KitManifest {
	return JSON.parse(fs.readFileSync(`${KIT}/package.json`, "utf8"));
}

function kitEntries(): KitEntry[] {
	return Object.entries(kitManifest().exports)
		.filter((entry): entry is [string, string] => typeof entry[1] === "string" && /\.tsx?$/.test(entry[1]))
		.map(([entry, source]) => ({ subpath: entry.slice(1), source: path.posix.join(KIT, source) }));
}

const declarationOfKitSource = (source: string): string =>
	`${LAID_AT}/kit/${source.slice(`${KIT}/src/`.length).replace(/\.tsx?$/, ".d.ts")}`;

function probeConfig(): object {
	const entries = [HANDED_TO_A_WIDGET, ...kitEntries().map(({ source }) => source), ...REACT_TYPES, ...REACT_DOM_TYPES];
	const { compilerOptions } = widgetOptions();
	return {
		compilerOptions: { ...compilerOptions, paths: {}, types: [], skipLibCheck: true, noEmit: true },
		files: entries.map((at) => path.join(REPO, at)),
		references: [KIT, CORE].map((at) => ({ path: path.join(REPO, at) })),
	};
}

function filesReached(): string[] {
	const probeAt = fs.mkdtempSync(path.join(os.tmpdir(), "wg-types-"));
	try {
		const configAt = path.join(probeAt, "tsconfig.json");
		fs.writeFileSync(configAt, JSON.stringify(probeConfig()));
		const listed = execFileSync("npx", ["--no-install", "tsc", "-p", configAt, "--listFilesOnly"], {
			encoding: "utf8",
		});
		return listed
			.split("\n")
			.filter(Boolean)
			.map(repoPathOf)
			.filter((at) => !at.startsWith("node_modules/@typescript/") && !at.startsWith("node_modules/typescript/"));
	} finally {
		fs.rmSync(probeAt, { recursive: true, force: true });
	}
}

function laidNameOf(at: string): string {
	if (at === HANDED_TO_A_WIDGET) return `${LAID_AT}/widgetarium.d.ts`;
	const root = LAID_ROOTS.find(([from]) => at.startsWith(from));
	if (!root) throw new Error(`${at} is reached by the widget surface and has no place in a vault`);
	return `${root[1]}${at.slice(root[0].length)}`;
}

function packageRootOf(at: string): string {
	const parts = at.split("/");
	const last = parts.lastIndexOf("node_modules");
	const depth = parts[last + 1]?.startsWith("@") ? 3 : 2;
	return parts.slice(0, last + depth).join("/");
}

function packageManifestsOf(reached: readonly string[]): string[] {
	const roots = new Set(reached.filter((at) => at.startsWith("node_modules/")).map(packageRootOf));
	return [...roots].map((root) => `${root}/package.json`).filter((at) => fs.existsSync(at));
}

const vaultFacing = (text: string): string => text.replaceAll(CORE_SOURCES_SEEN_FROM_THE_SDK, "./core/");

function laidFiles(reached: readonly string[]): Record<string, string> {
	const laid: Record<string, string> = {};
	for (const at of [...reached, ...packageManifestsOf(reached)]) {
		const text = fs.readFileSync(at, "utf8");
		laid[laidNameOf(at)] = at === HANDED_TO_A_WIDGET ? vaultFacing(text) : text;
	}
	return laid;
}

function kitPaths(): Record<string, string[]> {
	const paths: Record<string, string[]> = {};
	for (const { subpath, source } of kitEntries()) {
		const laid = [`./${declarationOfKitSource(source)}`];
		paths[`widgetarium/kit${subpath}`] = laid;
		paths[`@widgetarium/kit${subpath}`] = laid;
	}
	return paths;
}

function standaloneTsconfig(): string {
	const held = widgetOptions();
	const options = {
		...held.compilerOptions,
		paths: {
			widgetarium: [`./${LAID_AT}/widgetarium.d.ts`],
			...kitPaths(),
			"@*/lib": ["./@*/lib"],
			"*": [`./${PACKAGES_LAID_AT}/*`, `./${PACKAGES_LAID_AT}/@types/*`],
		},
		types: [],
		noImplicitAny: false,
		noUnusedLocals: false,
		skipLibCheck: true,
	};
	return `${JSON.stringify({ compilerOptions: options, include: [`./${LAID_AT}/*.d.ts`, "./**/*.ts", "./**/*.tsx"] }, null, "\t")}\n`;
}
