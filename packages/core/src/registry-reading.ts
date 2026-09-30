import { WIDGETS_DIR, LOCK_PATH } from "./paths.js";
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

export interface RegistryAdapter {
	exists(path: string): Promise<boolean>;
	read(path: string): Promise<string>;
	list(path: string): Promise<FolderListing>;
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

interface VaultWidgets {
	readonly scopes: readonly string[];
	readonly sheets: readonly OwnedSheet[];
	readonly folders: readonly string[];
	readonly libPaths: readonly (string | null)[];
	readonly libSources: readonly (string | null)[];
	readonly sheetSources: readonly (string | null)[];
	readonly widgetSources: readonly (HeldWidget | null)[];
	readonly lockText: string | null;
}

type ReadPresent = (path: string) => Promise<string | null> | null;

// TRADE-OFF: every read is asked for at once and only the writing that follows is ordered, because a vault on iCloud or Dropbox answers each read in its own time and one after another was the whole start-up
// TRADE-OFF: one listing per folder instead of one exists per file it might hold — on a vault iCloud serves, each question to the disk is what start-up spends
export async function readEverything(adapter: RegistryAdapter): Promise<VaultWidgets> {
	const scopes = (await adapter.list(WIDGETS_DIR)).folders;
	const scopeListings = await Promise.all(scopes.map((scope) => adapter.list(scope)));
	const foldersPerScope = scopeListings.map((held) => held.folders);
	const folders = foldersPerScope.flat();
	const folderFiles = await Promise.all(folders.map((folder) => filesIn(adapter, folder)));
	const present = new Set([...scopeListings.flatMap((held) => held.files), ...folderFiles.flat()]);
	const sheets = sheetsOf(scopes, foldersPerScope).filter((sheet) => present.has(sheet.path));
	const readPresent: ReadPresent = (path) => (present.has(path) ? readIfThere(adapter, path, { known: true }) : null);
	const libPaths = scopes.map((scope, at) => libPathIn(scope, scopeListings[at]?.files ?? []));
	const [libSources, sheetSources, widgetSources, lockText] = await Promise.all([
		Promise.all(libPaths.map((path) => (path === null ? null : readPresent(path)))),
		Promise.all(sheets.map((sheet) => readPresent(sheet.path))),
		Promise.all(
			folders.map((folder, at) =>
				readWidget(
					folder,
					(folderFiles[at] ?? []).map((path) => path.slice(folder.length + 1)),
					readPresent,
				),
			),
		),
		readIfThere(adapter, LOCK_PATH),
	]);
	return { scopes, sheets, folders, libPaths, libSources, sheetSources, widgetSources, lockText };
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
