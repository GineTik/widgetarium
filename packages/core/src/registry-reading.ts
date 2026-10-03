import { LOCK_PATH, WIDGET_ROOTS } from "./paths.js";
import { EMPTY_LOCK, readLock } from "./engine/widget-lock.js";
import type { WidgetLock } from "./engine/widget-lock.js";
import {
	SHEET_FILES,
	SOURCE_FILES,
	buildFolder,
	builtCodePath,
	builtSheetPath,
	isWidgetModule,
	javascriptSourceRefusal,
	libFileIn,
} from "./engine/widget-build.js";
import type { FolderListing } from "./engine/widget-build.js";
import { RECORD_FILE } from "./engine/catalogue-index.js";
import { isObject } from "./engine/is-object.js";
import { isScopeFolder } from "./engine/source-disk.js";

export interface FileStat {
	readonly mtime: number;
	readonly size: number;
}

export interface RegistryAdapter {
	exists(path: string): Promise<boolean>;
	read(path: string): Promise<string>;
	list(path: string): Promise<FolderListing>;
	stat?(path: string): Promise<FileStat | null>;
}

export type Fingerprint = Readonly<Record<string, string>>;

export interface PackageSource {
	readonly key: string;
	readonly path: string;
	readonly source: string;
}

export interface VaultRead {
	readonly widgets: VaultWidgets;
	readonly packages: readonly PackageSource[];
	readonly fingerprint: Fingerprint | null;
}

interface VaultListing {
	readonly scopes: readonly string[];
	readonly scopeListings: readonly FolderListing[];
	readonly folders: readonly string[];
	readonly folderFiles: readonly (readonly string[])[];
	readonly present: ReadonlySet<string>;
}

export interface OwnedSheet {
	readonly owner: string;
	readonly path: string;
}

export interface HeldWidget {
	readonly record: string | null;
	readonly files: Readonly<Record<string, string>> | null;
	readonly build: string | null;
	readonly refusal: string | null;
}

export interface VaultWidgets {
	readonly scopes: readonly string[];
	readonly sheets: readonly OwnedSheet[];
	readonly folders: readonly string[];
	readonly libPaths: readonly (string | null)[];
	readonly libSources: readonly (string | null)[];
	readonly sheetSources: readonly (string | null)[];
	readonly widgetSources: readonly (HeldWidget | null)[];
	readonly lockText: string | null;
}

type TextsByPath = ReadonlyMap<string, string>;

type ReadPresent = (path: string) => Promise<string | null> | null;

const ABSENT = "absent";

const NO_WIDGETS: VaultWidgets = {
	scopes: [],
	sheets: [],
	folders: [],
	libPaths: [],
	libSources: [],
	sheetSources: [],
	widgetSources: [],
	lockText: null,
};

// TRADE-OFF: every file is stamped before it is read, so a change landing mid-read leaves a stamp older than the text and the next look reads it again
export async function readVault(
	adapter: RegistryAdapter,
	held: VaultRead | null = null,
	roots: readonly string[] = WIDGET_ROOTS,
): Promise<VaultRead> {
	const listing = await listVault(adapter, roots);
	if (listing === null) return { widgets: NO_WIDGETS, packages: [], fingerprint: {} };
	const listed = await stampsOf(adapter, [...listing.present, LOCK_PATH]);
	const textsHeld = held === null ? new Map<string, string>() : textsHeldIn(held);
	const widgets = await readEverything(adapter, listing, unchangedTextsOf(textsHeld, held, listed));
	const packagePaths = packagePathsIn(parseLock(widgets.lockText));
	const packed = await stampsOf(
		adapter,
		packagePaths.map((each) => each.path),
	);
	const packages = await readPackages(adapter, packagePaths, unchangedTextsOf(textsHeld, held, packed));
	return { widgets, packages, fingerprint: listed === null || packed === null ? null : { ...listed, ...packed } };
}

export async function fingerprintNow(adapter: RegistryAdapter, known: Fingerprint): Promise<Fingerprint | null> {
	const listing = await listVault(adapter);
	return stampsOf(adapter, [...(listing?.present ?? []), ...Object.keys(known)]);
}

export function onlyUnderRoot(adapter: RegistryAdapter, root: string): RegistryAdapter {
	const isUnder = (path: string): boolean => path === root || path.startsWith(`${root}/`);
	return {
		exists: (path) => (isUnder(path) ? adapter.exists(path) : Promise.resolve(false)),
		read: (path) => (isUnder(path) ? adapter.read(path) : Promise.reject(new Error(`${path} is outside ${root}`))),
		list: (path) => (isUnder(path) ? adapter.list(path) : Promise.resolve({ files: [], folders: [] })),
		stat: (path) => (isUnder(path) ? (adapter.stat?.(path) ?? Promise.resolve(null)) : Promise.resolve(null)),
	};
}

export function withRootRead(read: VaultRead, fresh: VaultRead, root: string): VaultRead {
	const freshScopes = new Set(fresh.widgets.scopes.map(scopeNameOf));
	const isKept = (path: string): boolean =>
		!path.startsWith(`${root}/`) && !freshScopes.has(scopeNameOf(scopeOfPath(path, read.widgets.scopes)));
	const kept = read.widgets;
	const scopesAt = indexesWhere(kept.scopes, isKept);
	const sheetsAt = indexesWhere(
		kept.sheets.map((sheet) => sheet.path),
		isKept,
	);
	const foldersAt = indexesWhere(kept.folders, isKept);
	const got = fresh.widgets;
	return {
		...read,
		widgets: {
			...kept,
			scopes: [...got.scopes, ...pick(kept.scopes, scopesAt)],
			libPaths: [...got.libPaths, ...pick(kept.libPaths, scopesAt)],
			libSources: [...got.libSources, ...pick(kept.libSources, scopesAt)],
			sheets: [...got.sheets, ...pick(kept.sheets, sheetsAt)],
			sheetSources: [...got.sheetSources, ...pick(kept.sheetSources, sheetsAt)],
			folders: [...got.folders, ...pick(kept.folders, foldersAt)],
			widgetSources: [...got.widgetSources, ...pick(kept.widgetSources, foldersAt)],
		},
		fingerprint:
			read.fingerprint === null || fresh.fingerprint === null
				? null
				: {
						...Object.fromEntries(Object.entries(read.fingerprint).filter(([path]) => isKept(path))),
						...fresh.fingerprint,
					},
	};
}

export function pathsChanged(was: Fingerprint, now: Fingerprint): string[] {
	const paths = new Set([...Object.keys(was), ...Object.keys(now)]);
	return [...paths].filter((path) => was[path] !== now[path]);
}

// TRADE-OFF: a read that fails comes back as a value rather than throwing, because one file mid-fetch on iCloud used to reject the whole Promise.all and the vault came up with no widgets at all
export async function readIfThere(
	adapter: RegistryAdapter,
	path: string,
	{ known = false }: { readonly known?: boolean } = {},
): Promise<string | null> {
	try {
		if (!known && !(await adapter.exists(path))) return null;
		return await adapter.read(path);
	} catch (failure) {
		console.error(`[widgetarium] cannot read ${path}`, failure);
		return null;
	}
}

export function parseLock(text: string | null): WidgetLock {
	try {
		return readLock(JSON.parse(text ?? "null"));
	} catch {
		return EMPTY_LOCK;
	}
}

function withoutShadowedScopes(scopes: readonly string[]): string[] {
	const named = new Set<string>();
	return scopes.filter((scope) => {
		const name = scopeNameOf(scope);
		if (named.has(name)) return false;
		named.add(name);
		return true;
	});
}

function indexesWhere(list: readonly string[], keep: (path: string) => boolean): number[] {
	return list.flatMap((path, at) => (keep(path) ? [at] : []));
}

function pick<T>(list: readonly T[], indexes: readonly number[]): T[] {
	return indexes.flatMap((at) => {
		const item = list[at];
		return item === undefined ? [] : [item];
	});
}

function scopeNameOf(scope: string): string {
	return scope.slice(scope.lastIndexOf("/") + 1);
}

function scopeOfPath(path: string, scopes: readonly string[]): string {
	return scopes.find((scope) => path === scope || path.startsWith(`${scope}/`)) ?? "";
}

async function stampsOf(adapter: RegistryAdapter, paths: readonly string[]): Promise<Fingerprint | null> {
	const stat = adapter.stat?.bind(adapter);
	if (!stat) return null;
	const unique = [...new Set(paths)];
	const stamps = await Promise.all(unique.map(async (path) => stampOf(await stat(path).catch(() => null))));
	return Object.fromEntries(unique.map((path, at) => [path, stamps[at] ?? ABSENT]));
}

function stampOf(stat: FileStat | null): string {
	return stat === null ? ABSENT : `${stat.mtime}:${stat.size}`;
}

function packagePathsIn(lock: WidgetLock): { readonly key: string; readonly path: string }[] {
	return Object.entries(lock.modules).map(([key, entry]) => ({ key, path: pathOf(entry) }));
}

async function readPackages(
	adapter: RegistryAdapter,
	paths: readonly { readonly key: string; readonly path: string }[],
	unchanged: TextsByPath,
): Promise<PackageSource[]> {
	const sources = await Promise.all(paths.map((each) => unchanged.get(each.path) ?? readIfThere(adapter, each.path)));
	return paths.flatMap((each, at) => {
		const source = sources[at];
		return typeof source === "string" ? [{ ...each, source }] : [];
	});
}

function pathOf(entry: unknown): string {
	const path = isObject(entry) ? entry["path"] : undefined;
	return String(path);
}

function unchangedTextsOf(textsHeld: TextsByPath, held: VaultRead | null, stampsNow: Fingerprint | null): TextsByPath {
	const stampsHeld = held?.fingerprint ?? null;
	if (stampsHeld === null || stampsNow === null) return new Map();
	return new Map([...textsHeld].filter(([path]) => stampsNow[path] !== ABSENT && stampsHeld[path] === stampsNow[path]));
}

function textsHeldIn({ widgets, packages }: VaultRead): Map<string, string> {
	const texts = new Map<string, string>();
	const keep = (path: string | null | undefined, text: string | null | undefined): void => {
		if (path && text) texts.set(path, text);
	};
	widgets.libPaths.forEach((path, at) => keep(path, widgets.libSources[at]));
	widgets.sheets.forEach((sheet, at) => keep(sheet.path, widgets.sheetSources[at]));
	widgets.folders.forEach((folder, at) => keepWidgetTexts(keep, folder, widgets.widgetSources[at]));
	keep(LOCK_PATH, widgets.lockText);
	for (const each of packages) keep(each.path, each.source);
	return texts;
}

function keepWidgetTexts(
	keep: (path: string, text: string | null | undefined) => void,
	folder: string,
	held: HeldWidget | null | undefined,
): void {
	keep(`${folder}/${RECORD_FILE}`, held?.record);
	keep(builtCodePath(folder), held?.build);
	for (const [name, text] of Object.entries(held?.files ?? {})) keep(`${folder}/${name}`, text);
}

// TRADE-OFF: one listing per folder instead of one exists per file it might hold — on a vault iCloud serves, each question to the disk is what start-up spends
async function listVault(
	adapter: RegistryAdapter,
	roots: readonly string[] = WIDGET_ROOTS,
): Promise<VaultListing | null> {
	const rootsThere = (
		await Promise.all(roots.map(async (root) => ((await adapter.exists(root)) ? [root] : [])))
	).flat();
	if (rootsThere.length === 0) return null;
	const scopesPerRoot = await Promise.all(
		rootsThere.map(async (root) => (await adapter.list(root)).folders.filter(isScopeFolder)),
	);
	const scopes = withoutShadowedScopes(scopesPerRoot.flat());
	const scopeListings = await Promise.all(scopes.map((scope) => adapter.list(scope)));
	const folders = scopeListings.flatMap((held) => held.folders);
	const folderFiles = await Promise.all(folders.map((folder) => filesIn(adapter, folder)));
	const present = new Set([...scopeListings.flatMap((held) => held.files), ...folderFiles.flat()]);
	return { scopes, scopeListings, folders, folderFiles, present };
}

// TRADE-OFF: every read is asked for at once and only the writing that follows is ordered, because a vault on iCloud or Dropbox answers each read in its own time and one after another was the whole start-up
async function readEverything(
	adapter: RegistryAdapter,
	listing: VaultListing,
	unchanged: TextsByPath,
): Promise<VaultWidgets> {
	const [found, lockText] = await Promise.all([
		readWidgetFiles(listing, presentReaderOf(adapter, listing.present, unchanged)),
		unchanged.get(LOCK_PATH) ?? readIfThere(adapter, LOCK_PATH),
	]);
	return { ...found, lockText };
}

async function readWidgetFiles(
	listing: VaultListing,
	readPresent: ReadPresent,
): Promise<Omit<VaultWidgets, "lockText">> {
	const { scopes, scopeListings, folders } = listing;
	const sheets = presentSheetsOf(listing);
	const libPaths = scopes.map((scope, at) => libPathIn(scope, scopeListings[at]?.files ?? []));
	const [libSources, sheetSources, widgetSources] = await Promise.all([
		Promise.all(libPaths.map((path) => (path === null ? null : readPresent(path)))),
		Promise.all(sheets.map((sheet) => readPresent(sheet.path))),
		readWidgets(listing, readPresent),
	]);
	return { scopes, sheets, folders, libPaths, libSources, sheetSources, widgetSources };
}

function presentSheetsOf({ scopes, scopeListings, present }: VaultListing): OwnedSheet[] {
	return sheetsOf(
		scopes,
		scopeListings.map((held) => held.folders),
	).filter((sheet) => present.has(sheet.path));
}

function presentReaderOf(adapter: RegistryAdapter, present: ReadonlySet<string>, unchanged: TextsByPath): ReadPresent {
	return (path) => {
		if (!present.has(path)) return null;
		const text = unchanged.get(path);
		return text === undefined ? readIfThere(adapter, path, { known: true }) : Promise.resolve(text);
	};
}

function readWidgets({ folders, folderFiles }: VaultListing, readPresent: ReadPresent): Promise<(HeldWidget | null)[]> {
	const namesIn = (folder: string, at: number): string[] =>
		(folderFiles[at] ?? []).map((path) => path.slice(folder.length + 1));
	return Promise.all(folders.map((folder, at) => readWidget(folder, namesIn(folder, at), readPresent)));
}

function sheetsOf(scopes: readonly string[], foldersPerScope: readonly (readonly string[])[]): OwnedSheet[] {
	return scopes.flatMap((scope, at) => [
		{ owner: scope, path: `${scope}/tokens.css` },
		...(foldersPerScope[at] ?? []).flatMap((folder) => [
			{ owner: folder, path: builtSheetPath(folder) },
			...SHEET_FILES.map((name) => ({ owner: folder, path: `${folder}/${name}` })),
		]),
	]);
}

async function readWidget(folder: string, names: readonly string[], read: ReadPresent): Promise<HeldWidget | null> {
	const modules = names.filter(isWidgetModule);
	const [card = null, built = null, ...sources] = await Promise.all(
		[`${folder}/${RECORD_FILE}`, builtCodePath(folder), ...modules.map((name) => `${folder}/${name}`)].map(read),
	);
	const refusal = javascriptSourceRefusal(names, folder);
	if (refusal) return { record: card, files: null, build: null, refusal };
	if (!SOURCE_FILES.some((name) => names.includes(name))) return null;
	return {
		record: card,
		files: Object.fromEntries(modules.map((name, at) => [name, sources[at] ?? ""])),
		build: built,
		refusal: null,
	};
}

async function filesIn(adapter: RegistryAdapter, folder: string, isRoot = true): Promise<string[]> {
	const held = await adapter.list(folder);
	const found = [...held.files];
	for (const inner of held.folders) {
		if (isRoot && inner === buildFolder(folder)) found.push(...(await adapter.list(inner)).files);
		else found.push(...(await filesIn(adapter, inner, false)));
	}
	return found;
}

function libPathIn(scope: string, files: readonly string[]): string | null {
	const name = libFileIn(files.map((path) => path.slice(scope.length + 1)));
	return name === null ? null : `${scope}/${name}`;
}
