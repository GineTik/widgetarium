import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as prettier from "prettier";
import { RECORD_FILE, RECORD_FILES, cardOf } from "../packages/core/src/engine/catalogue-index.ts";
import { WIDGET_API } from "../packages/core/src/version.ts";
import {
	EVERY_SOURCE_FILE,
	LIB_FILES,
	SHEET_FILES,
	SOURCE_FILES,
	compileWidget,
	compileWidgetFolder,
	isWidgetModule,
	missingSourceRefusal,
	type FolderFiles,
} from "../packages/core/src/engine/widget-build.ts";
import { ANSWERED_BY_THE_ENGINE, facadeUrl, realPathIn } from "../packages/core/src/engine/modules.ts";
import { idOfFolder } from "../packages/core/src/engine/github.ts";
import * as declaredBuilders from "../packages/core/src/gateway/declared.ts";
import * as queryBuilders from "../packages/core/src/gateway/queries.ts";
import type { DeclaredModule, DeclaredProps } from "../packages/core/src/gateway/declared-types.ts";
import type { ModuleManifest } from "../packages/core/src/gateway/manifest.ts";
import { isPropsToDefine } from "../packages/core/src/widget-api.ts";
import { isRecord } from "./page-dom.ts";

export interface ScopeLib {
	readonly name: string;
	readonly path: string;
	readonly source: string;
}

interface LockedPackage {
	readonly version?: string;
}

export interface Lockfile {
	readonly packages?: Readonly<Record<string, LockedPackage>>;
}

type Dependencies = Readonly<Record<string, string>>;

type FoundDependencies =
	| { readonly ok: true; readonly dependencies: Dependencies; readonly failure: null }
	| { readonly ok: false; readonly dependencies: null; readonly failure: string };

export type PublishedRecord = ReturnType<typeof cardOf> & {
	readonly files: readonly string[];
	readonly dependencies: Dependencies;
	readonly widgetDependencies: readonly string[];
};

type Published =
	| { readonly ok: true; readonly record: PublishedRecord; readonly sheet: string | null; readonly failure: null }
	| { readonly ok: false; readonly record: null; readonly sheet: null; readonly failure: string };

export interface PublishAsk {
	readonly folder: string;
	readonly files: FolderFiles;
	readonly lib?: ScopeLib | null;
	readonly lockfile: Lockfile | null;
	readonly askEsm: (url: string) => Promise<string>;
}

type RequireInWidget = (name: string) => unknown;

export const PUBLISHED_SHEET = firstSheetName();

const ANYTHING: object = new Proxy(function anything() {}, {
	get: (_held, name) => (typeof name === "symbol" ? undefined : ANYTHING),
	apply: () => ANYTHING,
	construct: () => ANYTHING,
});

const NOT_DECLARED_PROPS = "the widget does not export createWidget({ inject: { ... }, draw })";

const WIDGET_GLOBALS = {
	h: () => null,
	Fragment: null,
	kitModule: ANYTHING,
	useState: <T>(initial: T | (() => T)) => [initial instanceof Function ? initial() : initial, () => {}],
	useEffect: () => {},
	useMemo: <T>(make: () => T) => make(),
	useRef: () => ({ current: null }),
};

export function packageNames(code: string, heldElsewhere: readonly string[]): string[] {
	const held = new Set(heldElsewhere);
	const found = new Set<string>();
	for (const [, specifier = ""] of String(code).matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
		if (specifier.startsWith(".") || held.has(specifier) || held.has(packageOf(specifier))) continue;
		found.add(packageOf(specifier));
	}
	return [...found].sort();
}

export function dependenciesFrom(names: readonly string[], lockfile: Lockfile | null): FoundDependencies {
	const dependencies: Record<string, string> = {};
	for (const name of names) {
		const version = lockfile?.packages?.[`node_modules/${name}`]?.version;
		if (!version)
			return {
				ok: false,
				dependencies: null,
				failure: `"${name}" is imported by the widget, and the lockfile pins no version for it`,
			};
		dependencies[name] = `^${version}`;
	}
	return { ok: true, dependencies, failure: null };
}

export function declarationIn(code: string, lib: ScopeLib | null = null): { manifest: ModuleManifest } {
	const widgetarium = widgetariumInRun();
	const libs = new Map<string, unknown>();
	const require: RequireInWidget = (name) => (name === "widgetarium" ? widgetarium : (libs.get(name) ?? ANYTHING));
	if (lib) libs.set(lib.name, exportsOfRun(compileWidget(lib.source, lib.path), require));
	const manifest = declaredBuilders.manifestOfModule(exportsOfRun(code, require));
	if (!manifest) throw new Error(NOT_DECLARED_PROPS);
	return { manifest };
}

export function scopeLibBeside(folder: string): ScopeLib | null {
	const scopeFolder = path.dirname(folder);
	const file = LIB_FILES.find((name) => fs.existsSync(path.join(scopeFolder, name)));
	if (!file) return null;
	const at = path.join(scopeFolder, file);
	return { name: `${path.basename(scopeFolder)}/lib`, path: at, source: fs.readFileSync(at, "utf8") };
}

export async function cardText(record: PublishedRecord, at: string): Promise<string> {
	const options = await prettier.resolveConfig(at);
	return prettier.format(JSON.stringify(record, null, "\t"), { ...options, filepath: at });
}

export function widgetDependenciesIn(record: unknown): string[] {
	const fields = isRecord(record) ? record : {};
	const named = [
		...valuesOf(fields["slots"]).map((slot) => stringAt(slot, "default")),
		...valuesOf(fields["mounts"]).flatMap(mountedWidgets),
	];
	return [...new Set(named.filter((id): id is string => id !== null))].sort();
}

export async function publishWidget({ folder, files, lib = null, lockfile, askEsm }: PublishAsk): Promise<Published> {
	const from = SOURCE_FILES.find((name) => typeof files[name] === "string");
	if (!from) return refuse(missingSourceRefusal(Object.keys(files), folder));

	const id = idOfFolder(folder);
	if (!id) return refuse(`${folder} is not a @scope/name folder`);

	let built: ReturnType<typeof compiledAndDeclared>;
	try {
		built = compiledAndDeclared(files, folder, lib);
	} catch (failure) {
		return refuse(`${folder} could not be read: ${messageOf(failure)}`);
	}

	const scope = id.slice(0, id.indexOf("/"));
	const found = dependenciesFrom(packageNames(built.code, [...ANSWERED_BY_THE_ENGINE, `${scope}/lib`]), lockfile);
	if (!found.ok) return refuse(found.failure);

	const unservable = await esmRefusal(askEsm, found.dependencies);
	if (unservable) return refuse(unservable);

	const sheet = SHEET_FILES.map((name) => files[name]).find((text) => typeof text === "string") ?? null;
	const declaredCard = cardOf(built.declared.manifest, WIDGET_API);
	const record: PublishedRecord = {
		...declaredCard,
		files: publishedFileNames(files, from, sheet),
		dependencies: found.dependencies,
		widgetDependencies: widgetDependenciesIn(declaredCard),
	};
	return { ok: true, record, sheet, failure: null };
}

export function widgetModulesOnDisk(folder: string): string[] {
	return fs
		.readdirSync(folder, { recursive: true })
		.map((name) => String(name).split(path.sep).join("/"))
		.filter(isWidgetModule)
		.sort();
}

export function widgetFolders(root: string): string[] {
	return fs
		.readdirSync(root, { withFileTypes: true })
		.filter((scope) => scope.isDirectory() && scope.name.startsWith("@"))
		.flatMap((scope) =>
			fs
				.readdirSync(path.join(root, scope.name), { withFileTypes: true })
				.filter((entry) => entry.isDirectory())
				.map((entry) => path.join(root, scope.name, entry.name)),
		)
		.filter((folder) => EVERY_SOURCE_FILE.some((name) => fs.existsSync(path.join(folder, name))));
}

export async function writeCardBeside(folder: string): Promise<void> {
	const done = await cardMadeFrom(folder);
	if (!done.ok) {
		console.error(`!!  ${folder}: ${done.failure}`);
		process.exitCode = 1;
		return;
	}
	const cardAt = path.join(folder, RECORD_FILE);
	fs.writeFileSync(cardAt, await cardText(done.record, cardAt));
	console.log(`OK  ${folder}/${RECORD_FILE}`);
}

function firstSheetName(): string {
	const [first] = SHEET_FILES;
	if (!first) throw new Error("the engine names no widget sheet file");
	return first;
}

const refuse = (failure: string): Published => ({ ok: false, record: null, sheet: null, failure });

const messageOf = (failure: unknown): string => (failure instanceof Error ? failure.message : String(failure));

function packageOf(specifier: string): string {
	const parts = specifier.split("/");
	return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? specifier);
}

function declaredPropsOf(inject: unknown): DeclaredProps {
	if (declaredBuilders.isDeclaredProps(inject)) return inject;
	if (!isPropsToDefine(inject)) throw new Error(NOT_DECLARED_PROPS);
	return declaredBuilders.defineProps(inject);
}

function declaringCreateWidget(widget: unknown): object {
	if (!isRecord(widget) || typeof widget["draw"] !== "function") throw new Error(NOT_DECLARED_PROPS);
	return Object.assign(widget["draw"], { declared: declaredPropsOf(widget["inject"] ?? {}) });
}

function exportsOfRun(code: string, require: RequireInWidget): DeclaredModule {
	const shell: { exports: DeclaredModule } = { exports: {} };
	new Function("require", "module", "exports", ...Object.keys(WIDGET_GLOBALS), code)(
		require,
		shell,
		shell.exports,
		...Object.values(WIDGET_GLOBALS),
	);
	return shell.exports;
}

function widgetariumInRun(): object {
	const surface = { ...declaredBuilders, ...queryBuilders, createWidget: declaringCreateWidget };
	return new Proxy(surface, { get: (held, name) => Reflect.get(held, name) ?? ANYTHING });
}

const valuesOf = (held: unknown): unknown[] => (isRecord(held) ? Object.values(held) : []);

const stringAt = (held: unknown, key: string): string | null =>
	isRecord(held) && typeof held[key] === "string" ? held[key] : null;

function mountedWidgets(mount: unknown): (string | null)[] {
	const rows = isRecord(mount) ? mount["default"] : undefined;
	return (Array.isArray(rows) ? rows : [rows]).map((row) => stringAt(row, "widget"));
}

async function esmRefusal(askEsm: PublishAsk["askEsm"], dependencies: Dependencies): Promise<string | null> {
	for (const [name, range] of Object.entries(dependencies)) {
		const answered = await askEsm(facadeUrl(name, range)).catch(messageOf);
		if (!realPathIn(answered)) return `"${name}@${range}" has no ES module build on esm.sh, so no vault could load it`;
	}
	return null;
}

function compiledAndDeclared(files: FolderFiles, folder: string, lib: ScopeLib | null) {
	const code = compileWidgetFolder(files, folder);
	return { code, declared: declarationIn(code, lib) };
}

function publishedFileNames(files: FolderFiles, from: string, sheet: string | null): string[] {
	return [
		from,
		...Object.keys(files).filter((name) => name !== from && isWidgetModule(name)),
		...(sheet === null ? [] : [PUBLISHED_SHEET]),
	];
}

function filesUnder(folder: string): Record<string, string> {
	const held: Record<string, string> = {};
	for (const name of new Set([...RECORD_FILES, ...EVERY_SOURCE_FILE, ...SHEET_FILES, ...widgetModulesOnDisk(folder)])) {
		const at = path.join(folder, name);
		if (fs.existsSync(at)) held[name] = fs.readFileSync(at, "utf8");
	}
	return held;
}

function publishedText(name: string, files: FolderFiles, sheet: string | null): string {
	const text = name === PUBLISHED_SHEET ? sheet : files[name];
	if (typeof text !== "string") throw new Error(`${name} is listed in the card and was never read`);
	return text;
}

async function runCli(folder: string, out: string): Promise<void> {
	const files = filesUnder(folder);
	const done = await publishedFromDisk(folder, files);
	if (!done.ok) {
		console.error(`!!  ${done.failure}`);
		process.exit(1);
	}

	fs.mkdirSync(out, { recursive: true });
	const cardAt = path.join(out, RECORD_FILE);
	fs.writeFileSync(cardAt, await cardText(done.record, cardAt));
	for (const name of done.record.files) {
		fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
		fs.writeFileSync(path.join(out, name), publishedText(name, files, done.sheet));
	}
	console.log(`OK  ${folder} → ${out}`);
}

function lockfileOnDisk(): Lockfile {
	return JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
}

const publishedFromDisk = (folder: string, files: FolderFiles): Promise<Published> =>
	publishWidget({
		folder,
		files,
		lib: scopeLibBeside(folder),
		lockfile: lockfileOnDisk(),
		askEsm: (url) => fetch(url).then((answer) => answer.text()),
	});

async function cardMadeFrom(folder: string): Promise<Published> {
	try {
		return await publishedFromDisk(folder, filesUnder(folder));
	} catch (failure) {
		return refuse(messageOf(failure));
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const asked = process.argv[2];
	if (!asked) {
		console.error("!!  name the widget folder to publish, as registry/@scope/name");
		process.exit(1);
	}
	const named = process.argv.indexOf("--out");
	await runCli(asked, (named < 0 ? undefined : process.argv[named + 1]) ?? path.join("dist", asked));
}
