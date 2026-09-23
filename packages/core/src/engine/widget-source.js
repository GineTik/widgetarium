import { RECORD_FILES, readRecord, recordIn } from "./catalogue-index.js";
import { SHEET_FILES, SOURCE_FILES, sourceFileIn } from "./widget-build.js";
import {
	commitUrl,
	idOfFolder,
	isBareFileName,
	isCleanRepositoryPath,
	rawUrl,
	readRepository,
	scopeRefusal,
	scopedName,
	treeUrl,
} from "./github.js";
import { REGISTRY_FILE, readRegistry } from "./registry-file.js";
import { contentHash } from "./content-hash.js";
import { apiRefusal } from "../version.js";

export const WIDGET_FILES = [...RECORD_FILES, ...SOURCE_FILES, ...SHEET_FILES];
export const SCOPE_FILES = ["lib.js", "tokens.css", "theme.css"];
export const WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS = "local";

export function stampOf(files) {
	const held = Object.keys(files ?? {}).sort();
	return contentHash(held.map((name) => `${name}:${files[name]}`).join("\n"));
}

export function scopeOf(folder) {
	return folder.slice(0, folder.lastIndexOf("/"));
}

export function createWidgetSource(doors) {
	return {
		async offersFrom(source) {
			if (!source?.path && !source?.repository) return [];
			return source.repository ? offersInRepository(doors, source) : offersInFolder(doors, source);
		},

		async filesOf(listed, onStep) {
			if (listed?.from?.folder) return fromFolder(doors, listed);
			return fromRepository(doors, listed?.manifest ?? {}, onStep);
		},
	};
}

async function offersInFolder({ disk }, source) {
	if (!disk || !(await disk.exists(source.path))) return [];

	const registry = await registryInFolder(disk, source);
	if (wasRefused(registry)) return [];

	const offers = registry
		? await listedInFolderRegistry(disk, source, registry.rows)
		: await listedInFolderTree(disk, source);
	return stampedWhereItMoved(offers, registry);
}

function wasRefused(registry) {
	if (!registry?.refusal) return false;
	console.error(`[widgetarium] ${registry.refusal}`);
	return true;
}

function stampedWhereItMoved(offers, registry) {
	if (!registry?.movedTo) return offers;
	return offers.map((offer) => ({ ...offer, manifest: { ...offer.manifest, movedTo: registry.movedTo } }));
}

async function registryInFolder(disk, source) {
	const at = `${source.path}/${REGISTRY_FILE}`;
	if (!(await disk.exists(at))) return null;
	try {
		return readRegistry(await disk.read(at), at);
	} catch (failure) {
		console.error(`[widgetarium] cannot read ${at}`, failure);
		return null;
	}
}

async function listedInFolderRegistry(disk, source, rows) {
	const found = [];
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

async function listedInFolderTree(disk, source) {
	const found = [];
	for (const scope of await disk.folders(source.path)) {
		for (const folder of await disk.folders(scope)) {
			const offer = await offeredFromFolder(disk, folder, source.path, null);
			if (offer) found.push(offer);
		}
	}
	return found;
}

async function offeredFromFolder(disk, folder, origin, id) {
	const held = await codeAt(disk, folder, scopeOf(folder));
	if (!held.code) return null;

	const read = await recordAt(disk, folder);
	const manifest = id ? { ...read, id } : read;
	if (!manifest?.id) return null;
	return {
		manifest,
		installed: false,
		origin,
		commit: stampOf(await filesUnder(disk, folder, WIDGET_FILES)),
		from: { folder },
		...held,
	};
}

async function offersInRepository(doors, source) {
	const repository = readRepository(source.repository);
	if (!repository) return [];
	try {
		const commit = String((await doors.fetchJson(commitUrl(repository, source.ref)))?.sha ?? "");
		if (!commit) return [];
		const registry = await registryIfThereIsOne(doors, repository, commit, source);
		if (wasRefused(registry)) return [];

		const offers = registry
			? await listedInRegistry(doors, repository, commit, source, registry.rows)
			: await listedInTree(doors, repository, commit, source);
		return stampedWhereItMoved(offers, registry);
	} catch (failure) {
		console.error(`[widgetarium] cannot read ${source.repository}`, failure);
		return [];
	}
}

async function registryIfThereIsOne({ fetchText }, repository, commit, source) {
	let text;
	try {
		text = await fetchText(rawUrl(repository, commit, REGISTRY_FILE));
	} catch {
		return null;
	}
	return readRegistry(text, `${source.repository}/${REGISTRY_FILE}`);
}

async function listedInRegistry(doors, repository, commit, source, rows) {
	const found = [];
	for (const row of rows) {
		const folder = row.path ?? scopedName(row.id);
		if (!folder) continue;
		const card = await recordServedAt(doors, repository, commit, folder);
		found.push(
			offeredFromRepository({ ...row, ...card, id: row.id, files: row.files ?? card?.files }, folder, commit, source),
		);
	}
	return found;
}

async function recordServedAt({ fetchText }, repository, commit, folder) {
	for (const name of RECORD_FILES) {
		const served = await fetchText(rawUrl(repository, commit, `${folder}/${name}`))
			.then(JSON.parse)
			.catch(() => null);
		if (served) return served;
	}
	return null;
}

function folderOfRecord(path) {
	const name = RECORD_FILES.find((held) => path.endsWith(`/${held}`));
	return name ? path.slice(0, -name.length - 1) : null;
}

async function listedInTree(doors, repository, commit, source) {
	const under = source.path ? `${source.path}/` : "";
	const tree = (await doors.fetchJson(treeUrl(repository, commit)))?.tree ?? [];
	const found = [];
	const seen = new Set();
	for (const node of tree) {
		const folder = node?.path?.startsWith(under) ? folderOfRecord(node.path) : null;
		if (!folder || seen.has(folder)) continue;
		seen.add(folder);
		const manifest = await recordServedAt(doors, repository, commit, folder);
		const id = manifest?.id ?? idOfFolder(folder);
		if (manifest && id) found.push(offeredFromRepository({ ...manifest, id }, folder, commit, source));
	}
	return found;
}

function offeredFromRepository(manifest, folder, commit, source) {
	return {
		manifest: { ...manifest, repository: source.repository, ref: source.ref, path: folder },
		installed: false,
		origin: source.repository,
		commit,
	};
}

async function codeAt(disk, folder, scope) {
	const held = {};
	for (const name of SOURCE_FILES) {
		const at = `${folder}/${name}`;
		if (!held.code && (await disk.exists(at))) Object.assign(held, { code: await disk.read(at), path: at });
	}
	if (!held.code) return held;

	const libAt = `${scope}/lib.js`;
	if (await disk.exists(libAt))
		Object.assign(held, {
			lib: await disk.read(libAt),
			libPath: libAt,
			scope: scope.slice(scope.lastIndexOf("/") + 1),
		});
	return held;
}

async function recordAt(disk, folder) {
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

async function fromFolder({ disk }, listed) {
	const refusal = scopeRefusal(listed.manifest?.id);
	if (refusal) return refuse(refusal);
	if (!disk) return refuse("this build cannot read a folder outside the vault");

	const folder = listed.from.folder;
	const files = await filesUnder(disk, folder, WIDGET_FILES);
	if (!sourceFileIn(files)) return refuse(`${folder} holds no widget source`);

	const scope = await filesUnder(disk, scopeOf(folder), SCOPE_FILES);
	return answered({ files, scope, record: readRecord(listed.manifest, idOfFolder(folder)), commit: stampOf(files) });
}

async function filesUnder(disk, folder, names) {
	const held = {};
	for (const name of names) {
		const at = `${folder}/${name}`;
		if (await disk.exists(at)) held[name] = await disk.read(at);
	}
	return held;
}

async function fromRepository(doors, manifest, onStep) {
	const repository = readRepository(manifest.repository);
	if (!repository) return refuse("this entry names no repository to fetch from");
	const refusal = scopeRefusal(manifest.id);
	if (refusal) return refuse(refusal);

	if (manifest.path !== undefined && manifest.path !== null && !isCleanRepositoryPath(manifest.path))
		return refuse(`"${manifest.path}" is not a place inside the repository`);

	const wanted = Array.isArray(manifest.files) && manifest.files.length > 0 ? manifest.files : WIDGET_FILES;
	const strays = wanted.filter((name) => !isBareFileName(name));
	if (strays.length > 0) return refuse(`"${strays[0]}" is not a file name a widget folder can hold`);
	if (!SOURCE_FILES.some((name) => wanted.includes(name))) return refuse("the entry lists no widget source");

	const fetched = await fetchedFrom(doors, repository, manifest, wanted, onStep);
	if (!fetched.ok) return fetched;

	const served = recordServedUnder(fetched.files, manifest);
	if (!served.ok) return refuse(served.failure);
	return answered({ files: fetched.files, scope: {}, record: served.record, commit: fetched.commit });
}

async function fetchedFrom({ fetchJson, fetchText }, repository, manifest, wanted, onStep) {
	const files = {};
	try {
		const commit = String((await fetchJson(commitUrl(repository, manifest.ref)))?.sha ?? "");
		if (!commit) return refuse("the repository named no commit for that ref");
		onStep?.({ done: 0, total: wanted.length });
		const under = manifest.path ?? scopedName(manifest.id);
		for (const [at, name] of wanted.entries()) {
			files[name] = await fetchText(rawUrl(repository, commit, `${under}/${name}`));
			onStep?.({ done: at + 1, total: wanted.length });
		}
		return { ok: true, files, commit, failure: null };
	} catch (failure) {
		return refuse(String(failure?.message ?? failure));
	}
}

function recordServedUnder(files, promised) {
	const served = recordIn(files);
	if (served === undefined) return { ok: true, record: readRecord(promised, promised.id), failure: null };

	let parsed;
	try {
		parsed = JSON.parse(served);
	} catch {
		return { ok: false, record: null, failure: "the widget's card did not come back as JSON" };
	}
	if (parsed?.id !== undefined && parsed.id !== promised.id)
		return { ok: false, record: null, failure: `the repository served "${parsed?.id}" under "${promised.id}"` };
	return { ok: true, record: readRecord(parsed, promised.id), failure: null };
}

function answered(held) {
	const refusal = apiRefusal(held.record);
	return refusal ? refuse(refusal) : { ok: true, ...held, failure: null };
}

function refuse(failure) {
	return { ok: false, files: null, scope: null, record: null, commit: null, failure };
}
