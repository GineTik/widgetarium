import { RECORD_FILES, readRecord } from "./catalogue-index.js";
import type { Fields, WidgetRecord } from "./catalogue-index.js";
import { LIB_FILES, SOURCE_FILES, sourceFileIn } from "./widget-build.js";
import { commitUrl, idOfFolder, isCleanRepositoryPath, rawUrl, readRepository, scopedName, treeUrl } from "./github.js";
import type { Repository } from "./github.js";
import { REGISTRY_FILE, readRegistry } from "./registry-file.js";
import type { RegistryFile, RegistryRow } from "./registry-file.js";
import { isObject } from "./is-object.js";
import { filesUnder, modulesAt, sayJavascriptRefused, scopeOf, stampOf, widgetFilesAt } from "./source-disk.js";
import type { HeldFiles, SourceDisk } from "./source-disk.js";

export interface WidgetSourcePlace {
	readonly path?: string | null;
	readonly repository?: string | null;
	readonly ref?: string | null;
}

export interface SourceDoors {
	readonly disk?: SourceDisk | null;
	readonly fetchJson: (url: string) => Promise<unknown>;
	readonly fetchText: (url: string) => Promise<string>;
}

export interface HeldCode {
	readonly sources?: HeldFiles;
	readonly path?: string;
	readonly lib?: string;
	readonly libPath?: string;
	readonly scope?: string;
}

export interface WidgetOffer extends HeldCode {
	readonly manifest: Fields;
	readonly installed: false;
	readonly origin: string;
	readonly commit: string;
	readonly from?: { readonly folder: string };
}

type FolderPlace = WidgetSourcePlace & { readonly path: string };
type RepositoryPlace = WidgetSourcePlace & { readonly repository: string };

export async function offersInFolder(disk: SourceDisk | null | undefined, source: FolderPlace): Promise<WidgetOffer[]> {
	if (!disk || !(await disk.exists(source.path))) return [];

	const registry = await registryInFolder(disk, source);
	if (wasRefused(registry)) return [];

	const offers = registry ? await listFolderRegistry(disk, source, registry.rows) : await listFolderTree(disk, source);
	return stampWhereItMoved(offers, registry);
}

export async function offersInRepository(doors: SourceDoors, source: RepositoryPlace): Promise<WidgetOffer[]> {
	const repository = readRepository(source.repository);
	if (!repository) return [];
	try {
		const commit = await commitNamed(doors, repository, source.ref);
		if (!commit) return [];
		const registry = await registryIfThereIsOne(doors, repository, commit, source);
		if (wasRefused(registry)) return [];

		const offers = registry
			? await listRegistry(doors, repository, commit, source, registry.rows)
			: await listTree(doors, repository, commit, source);
		return stampWhereItMoved(offers, registry);
	} catch (failure) {
		console.error(`[widgetarium] cannot read ${source.repository}`, failure);
		return [];
	}
}

export async function commitNamed({ fetchJson }: SourceDoors, repository: Repository, ref: unknown): Promise<string> {
	const answer = await fetchJson(commitUrl(repository, ref));
	return String((isObject(answer) ? answer["sha"] : undefined) ?? "");
}

function wasRefused(registry: RegistryFile | null): boolean {
	if (!registry?.refusal) return false;
	console.error(`[widgetarium] ${registry.refusal}`);
	return true;
}

function stampWhereItMoved(offers: WidgetOffer[], registry: RegistryFile | null): WidgetOffer[] {
	const movedTo = registry?.movedTo;
	if (!movedTo) return offers;
	return offers.map((offer) => ({ ...offer, manifest: { ...offer.manifest, movedTo } }));
}

async function registryInFolder(disk: SourceDisk, source: FolderPlace): Promise<RegistryFile | null> {
	const at = `${source.path}/${REGISTRY_FILE}`;
	if (!(await disk.exists(at))) return null;
	try {
		return readRegistry(await disk.read(at), at);
	} catch (failure) {
		console.error(`[widgetarium] cannot read ${at}`, failure);
		return null;
	}
}

async function listFolderRegistry(
	disk: SourceDisk,
	source: FolderPlace,
	rows: readonly RegistryRow[],
): Promise<WidgetOffer[]> {
	const found: WidgetOffer[] = [];
	for (const row of rows) {
		const under = row.path ?? scopedName(row.id);
		if (!under || !isCleanRepositoryPath(under)) continue;
		const offer = await offeredFromFolder(disk, `${source.path}/${under}`, source.path, row.id);
		if (offer) found.push(offer);
		else
			console.error(
				`[widgetarium] ${source.path}/${REGISTRY_FILE} lists "${row.id}" at ${under}, where no widget stands`,
			);
	}
	return found;
}

async function listFolderTree(disk: SourceDisk, source: FolderPlace): Promise<WidgetOffer[]> {
	const found: WidgetOffer[] = [];
	for (const scope of await disk.folders(source.path)) {
		for (const folder of await disk.folders(scope)) {
			const offer = await offeredFromFolder(disk, folder, source.path, null);
			if (offer) found.push(offer);
		}
	}
	return found;
}

async function offeredFromFolder(
	disk: SourceDisk,
	folder: string,
	origin: string,
	id: string | null,
): Promise<WidgetOffer | null> {
	const held = await codeAt(disk, folder, scopeOf(folder));
	if (!held.sources) return sayJavascriptRefused(disk, folder);

	const read = await recordAt(disk, folder);
	const manifest = id ? { ...read, id } : read;
	if (!manifest?.id) return null;
	return {
		manifest,
		installed: false,
		origin,
		commit: stampOf(await widgetFilesAt(disk, folder)),
		from: { folder },
		...held,
	};
}

async function registryIfThereIsOne(
	{ fetchText }: SourceDoors,
	repository: Repository,
	commit: string,
	source: RepositoryPlace,
): Promise<RegistryFile | null> {
	let text: string;
	try {
		text = await fetchText(rawUrl(repository, commit, REGISTRY_FILE));
	} catch {
		return null;
	}
	return readRegistry(text, `${source.repository}/${REGISTRY_FILE}`);
}

async function listRegistry(
	doors: SourceDoors,
	repository: Repository,
	commit: string,
	source: RepositoryPlace,
	rows: readonly RegistryRow[],
): Promise<WidgetOffer[]> {
	const found: WidgetOffer[] = [];
	for (const row of rows) {
		const folder = row.path ?? scopedName(row.id);
		if (!folder) continue;
		const card = await fetchServedRecord(doors, repository, commit, folder);
		const served = isObject(card) ? card : {};
		const manifest = { ...row, ...served, id: row.id, files: row.files ?? served["files"] };
		found.push(offeredFromRepository(manifest, folder, commit, source));
	}
	return found;
}

async function fetchServedRecord(
	{ fetchText }: SourceDoors,
	repository: Repository,
	commit: string,
	folder: string,
): Promise<unknown> {
	for (const name of RECORD_FILES) {
		const served = await fetchText(rawUrl(repository, commit, `${folder}/${name}`))
			.then((text): unknown => JSON.parse(text))
			.catch(() => null);
		if (served) return served;
	}
	return null;
}

function folderOfRecord(path: string): string | null {
	const name = RECORD_FILES.find((held) => path.endsWith(`/${held}`));
	return name ? path.slice(0, -name.length - 1) : null;
}

function treePathsIn(answer: unknown): unknown[] {
	const tree = isObject(answer) ? answer["tree"] : undefined;
	return Array.isArray(tree) ? tree.map((node): unknown => (isObject(node) ? node["path"] : undefined)) : [];
}

async function listTree(
	doors: SourceDoors,
	repository: Repository,
	commit: string,
	source: RepositoryPlace,
): Promise<WidgetOffer[]> {
	const under = source.path ? `${source.path}/` : "";
	const paths = treePathsIn(await doors.fetchJson(treeUrl(repository, commit)));
	const found: WidgetOffer[] = [];
	const seen = new Set<string>();
	for (const path of paths) {
		const folder = typeof path === "string" && path.startsWith(under) ? folderOfRecord(path) : null;
		if (!folder || seen.has(folder)) continue;
		seen.add(folder);
		const card = await fetchServedRecord(doors, repository, commit, folder);
		const manifest = isObject(card) ? card : null;
		const id = manifest?.["id"] ?? idOfFolder(folder);
		if (manifest && id) found.push(offeredFromRepository({ ...manifest, id }, folder, commit, source));
	}
	return found;
}

function offeredFromRepository(manifest: Fields, folder: string, commit: string, source: RepositoryPlace): WidgetOffer {
	return {
		manifest: { ...manifest, repository: source.repository, ref: source.ref, path: folder },
		installed: false,
		origin: source.repository,
		commit,
	};
}

async function codeAt(disk: SourceDisk, folder: string, scope: string): Promise<HeldCode> {
	const sources = await filesUnder(disk, folder, [...new Set([...SOURCE_FILES, ...(await modulesAt(disk, folder))])]);
	if (!sourceFileIn(sources)) return {};

	const libAt = await libPathAt(disk, scope);
	if (libAt === null) return { sources, path: folder };
	return {
		sources,
		path: folder,
		lib: await disk.read(libAt),
		libPath: libAt,
		scope: scope.slice(scope.lastIndexOf("/") + 1),
	};
}

async function libPathAt(disk: SourceDisk, scope: string): Promise<string | null> {
	for (const name of LIB_FILES) {
		if (await disk.exists(`${scope}/${name}`)) return `${scope}/${name}`;
	}
	return null;
}

async function recordAt(disk: SourceDisk, folder: string): Promise<WidgetRecord | null> {
	const held = await Promise.all(RECORD_FILES.map((name) => disk.exists(`${folder}/${name}`)));
	const name = RECORD_FILES[held.indexOf(true)];
	if (!name) return readRecord(null, idOfFolder(folder));
	const at = `${folder}/${name}`;
	try {
		return readRecord(JSON.parse(await disk.read(at)), idOfFolder(folder));
	} catch (failure) {
		console.error(`[widgetarium] cannot read ${at}`, failure);
		return null;
	}
}
