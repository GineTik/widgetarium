import { buildIsCurrent, buildRecord, withBuild, withModule } from "./widget-lock.js";
import type { BuildRecord, Texts, WidgetLock } from "./widget-lock.js";
import {
	LIB_FILES,
	SHEET_FILES,
	buildFolder,
	builtCodePath,
	builtSheetPath,
	compileWidgetFolder,
	importsScopeLib,
	modulesIn,
	sourceFileIn,
	widgetModulesUnder,
} from "./widget-build.js";
import type { FolderFiles, FolderListing } from "./widget-build.js";
import { TAILWIND, TAILWIND_RANGE, importsTailwind, buildSheet, candidatesIn, servedContent } from "./tailwind.js";
import type { SheetInputs } from "./tailwind.js";
import { moduleFromBundle } from "./compiled-module.js";
import type { ModuleSpace } from "./modules.js";
import { failureMessage } from "./failure-message.js";

export interface BuilderAdapter {
	exists(path: string): Promise<boolean>;
	mkdir(path: string): Promise<unknown>;
	read(path: string): Promise<string>;
	write(path: string, text: string): Promise<unknown>;
	remove(path: string): Promise<unknown>;
	list(at: string): Promise<FolderListing>;
}

export type CompiledSource =
	| { readonly ok: true; readonly from: string; readonly code: string; readonly failure: null }
	| { readonly ok: true; readonly from: null; readonly code: null; readonly failure: null }
	| { readonly ok: false; readonly from: null; readonly code: null; readonly failure: string };

export type AboutToBeWritten = Readonly<Record<string, string>>;

export interface BuildAsked {
	readonly lock: WidgetLock;
	readonly id: string;
	readonly folder: string;
	readonly files: FolderFiles;
	readonly aboutToBeWritten?: AboutToBeWritten;
}

export type MadeBuild =
	| {
			readonly ok: true;
			readonly lock: WidgetLock;
			readonly built: CompiledSource;
			readonly css: string | null;
			readonly record: BuildRecord | null;
			readonly failure: null;
	  }
	| {
			readonly ok: false;
			readonly lock: WidgetLock;
			readonly built: null;
			readonly css: null;
			readonly record: null;
			readonly failure: string;
	  };

export type Rebuilt =
	| { readonly ok: true; readonly lock: WidgetLock; readonly failure: null }
	| { readonly ok: false; readonly lock: WidgetLock; readonly failure: string };

export interface Builder {
	writeBuild(folder: string, built: CompiledSource, css: string | null): Promise<unknown>;
	make(asked: BuildAsked): Promise<MadeBuild>;
	isCurrent(record: BuildRecord | null | undefined, folder: string, files: FolderFiles): Promise<boolean>;
	sourceAndSheetsAt(folder: string): Promise<FolderFiles | null>;
	rebuild(lock: WidgetLock, id: string, folder: string, files: FolderFiles): Promise<Rebuilt>;
}

export interface BuilderDoors {
	readonly adapter: BuilderAdapter;
	readonly space: ModuleSpace;
}

type StyledSheet =
	| {
			readonly ok: true;
			readonly lock: WidgetLock;
			readonly css: string | null;
			readonly compiler: string | null;
			readonly inputs: SheetInputs;
			readonly failure: null;
	  }
	| {
			readonly ok: false;
			readonly lock: WidgetLock;
			readonly css: null;
			readonly compiler: string | null;
			readonly inputs: null;
			readonly failure: string;
	  };

interface SheetAsked extends BuilderDoors {
	readonly lock: WidgetLock;
	readonly id: string;
	readonly folder: string;
	readonly files: FolderFiles;
	readonly code: string | null;
	readonly aboutToBeWritten: AboutToBeWritten;
}

interface StyledInputs {
	readonly compiler: string | null;
	readonly inputs: SheetInputs;
}

export function compileSource(files: FolderFiles, folder: string): CompiledSource {
	const from = sourceFileIn(files);
	if (!from) return { ok: true, from: null, code: null, failure: null };
	try {
		return { ok: true, from, code: compileWidgetFolder(files, folder), failure: null };
	} catch (failure) {
		return { ok: false, from: null, code: null, failure: `${from} did not compile: ${failureMessage(failure)}` };
	}
}

export function createBuilder({ adapter, space }: BuilderDoors): Builder {
	async function writeBuild(folder: string, built: CompiledSource, css: string | null): Promise<unknown> {
		if (built.code === null) return undefined;
		await adapter.mkdir(buildFolder(folder));
		await adapter.write(builtCodePath(folder), built.code);
		if (css !== null) return adapter.write(builtSheetPath(folder), css);
		if (await adapter.exists(builtSheetPath(folder))) await adapter.remove(builtSheetPath(folder));
		return undefined;
	}

	async function make({ lock, id, folder, files, aboutToBeWritten = {} }: BuildAsked): Promise<MadeBuild> {
		const built = compileSource(files, folder);
		if (!built.ok) return refuseBuild(lock, built.failure);

		const styled = await compileSheet({ adapter, space, lock, id, folder, files, code: built.code, aboutToBeWritten });
		if (!styled.ok) return refuseBuild(lock, styled.failure);

		const lib = await scopeLibInput(adapter, folder, files, aboutToBeWritten);
		return {
			ok: true,
			lock: styled.lock,
			built,
			css: styled.css,
			record: recordOfBuild(folder, built, { compiler: styled.compiler, inputs: { ...styled.inputs, ...lib } }, files),
			failure: null,
		};
	}

	return {
		writeBuild,
		make,

		isCurrent: (record, folder, files) => isBuildCurrent(adapter, record, folder, files),
		sourceAndSheetsAt: (folder) => sourceAndSheetsIn(adapter, folder),

		async rebuild(lock, id, folder, files) {
			const made = await make({ lock, id, folder, files });
			if (!made.ok) return { ok: false, lock, failure: made.failure };

			await writeBuild(folder, made.built, made.css);
			return { ok: true, lock: made.record ? withBuild(made.lock, id, made.record) : made.lock, failure: null };
		},
	};
}

async function isBuildCurrent(
	adapter: BuilderAdapter,
	record: BuildRecord | null | undefined,
	folder: string,
	files: FolderFiles,
): Promise<boolean> {
	const recorded = record?.inputs ?? {};
	const wanted = [...inputNamesFor(folder, files), ...Object.keys(await scopeLibInput(adapter, folder, files))];
	if (!wanted.every((path) => path in recorded)) return false;

	const onDisk: Record<string, string | null> = {};
	for (const path of Object.keys(recorded)) onDisk[path] = servedContent(path) ?? (await readIfThere(adapter, path));
	return buildIsCurrent(record, onDisk);
}

async function sourceAndSheetsIn(adapter: BuilderAdapter, folder: string): Promise<FolderFiles | null> {
	const held: Record<string, string> = {};
	const modules = await widgetModulesUnder(folder, (at) => adapter.list(at));
	for (const name of [...modules, ...SHEET_FILES]) {
		const text = await readIfThere(adapter, `${folder}/${name}`);
		if (text !== null) held[name] = text;
	}
	return sourceFileIn(held) ? held : null;
}

function refuseBuild(lock: WidgetLock, failure: string): MadeBuild {
	return { ok: false, lock, built: null, css: null, record: null, failure };
}

function inputNamesFor(folder: string, files: FolderFiles | null | undefined): string[] {
	if (!sourceFileIn(files)) return [];
	const names = modulesIn(files);
	for (const name of SHEET_FILES) {
		if (typeof files?.[name] === "string") names.push(name);
	}
	return names.map((name) => `${folder}/${name}`);
}

function recordOfBuild(
	folder: string,
	built: CompiledSource,
	styled: StyledInputs,
	files: FolderFiles,
): BuildRecord | null {
	if (!built.from) return null;

	const own: Record<string, string | undefined> = {};
	for (const path of inputNamesFor(folder, files)) own[path] = files[path.slice(folder.length + 1)];
	const inputs: Texts = { ...own, ...styled.inputs };
	return buildRecord({ from: built.from, compiler: styled.compiler, inputs });
}

async function compileSheet({
	adapter,
	space,
	lock,
	id,
	folder,
	files,
	code,
	aboutToBeWritten,
}: SheetAsked): Promise<StyledSheet> {
	const name = SHEET_FILES.find((each) => typeof files[each] === "string");
	const sheet = name === undefined ? undefined : files[name];
	if (name === undefined || sheet === undefined || !importsTailwind(sheet))
		return { ok: true, lock, css: null, compiler: null, inputs: {}, failure: null };

	const found = await space.take(lock, TAILWIND, TAILWIND_RANGE);
	if (!found.ok) return { ok: false, lock, css: null, compiler: null, inputs: null, failure: found.failure };

	const done = await buildSheet({
		entry: { path: `${folder}/${name}`, content: sheet, base: folder },
		compiler: moduleFromBundle(await adapter.read(found.path), found.path),
		sheetOfTailwind: (each) => space.takeAsset(found.key, each),
		readFile: async (path) => aboutToBeWritten[path] ?? readIfThere(adapter, path),
		candidates: candidatesIn(code),
	});
	return { ...done, compiler: found.key, lock: withModule(lock, id, found) };
}

async function scopeLibInput(
	adapter: BuilderAdapter,
	folder: string,
	files: FolderFiles,
	aboutToBeWritten: AboutToBeWritten = {},
): Promise<Record<string, string>> {
	const scope = folder.slice(0, folder.lastIndexOf("/"));
	if (!importsScopeLib(files, scope.slice(scope.lastIndexOf("/") + 1))) return {};
	for (const name of LIB_FILES) {
		const path = `${scope}/${name}`;
		const text = aboutToBeWritten[path] ?? (await readIfThere(adapter, path));
		if (text !== null) return { [path]: text };
	}
	return {};
}

async function readIfThere(adapter: BuilderAdapter, path: string): Promise<string | null> {
	return (await adapter.exists(path)) ? adapter.read(path) : null;
}
