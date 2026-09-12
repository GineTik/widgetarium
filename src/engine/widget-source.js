import { RECORD_FILE, readRecord } from "./catalogue-index.js";
import { SHEET_FILES, SOURCE_FILES, sourceFileIn } from "./widget-build.js";
import { commitUrl, idOfFolder, rawUrl, readRepository, scopeRefusal, scopedName, treeUrl } from "./github.js";
import { apiRefusal } from "../version.js";

export const WIDGET_FILES = [RECORD_FILE, ...SOURCE_FILES, ...SHEET_FILES];
export const SCOPE_FILES = ["lib.js", "tokens.css"];

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
	const found = [];
	for (const scope of await disk.folders(source.path)) {
		for (const folder of await disk.folders(scope)) {
			const held = await codeAt(disk, folder, scope);
			if (!held.code) continue;
			const manifest = await recordAt(disk, folder);
			if (manifest?.id) found.push({ manifest, installed: false, origin: source.path, from: { folder }, ...held });
		}
	}
	return found;
}

async function offersInRepository({ fetchJson, fetchText }, source) {
	const repository = readRepository(source.repository);
	if (!repository) return [];
	try {
		const commit = String((await fetchJson(commitUrl(repository, source.ref)))?.sha ?? "");
		if (!commit) return [];
		return await listedInTree({ fetchJson, fetchText }, repository, commit, source);
	} catch (failure) {
		console.error(`[widgetarium] cannot read ${source.repository}`, failure);
		return [];
	}
}

async function listedInTree({ fetchJson, fetchText }, repository, commit, source) {
	const under = source.path ? `${source.path}/` : "";
	const tree = (await fetchJson(treeUrl(repository, commit)))?.tree ?? [];
	const found = [];
	for (const node of tree) {
		if (!node?.path?.startsWith(under) || !node.path.endsWith(`/${RECORD_FILE}`)) continue;
		const folder = node.path.slice(0, -RECORD_FILE.length - 1);
		const manifest = JSON.parse(await fetchText(rawUrl(repository, commit, node.path)));
		if (manifest?.id)
			found.push({
				manifest: { ...manifest, repository: source.repository, ref: source.ref, path: folder },
				installed: false,
				origin: source.repository,
			});
	}
	return found;
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
	const at = `${folder}/${RECORD_FILE}`;
	if (!(await disk.exists(at))) return readRecord(null, idOfFolder(folder));
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
	return answered({ files, scope, record: readRecord(listed.manifest, idOfFolder(folder)), commit: "local" });
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

	const wanted = Array.isArray(manifest.files) && manifest.files.length > 0 ? manifest.files : WIDGET_FILES;
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
	if (files[RECORD_FILE] === undefined) return { ok: true, record: readRecord(promised, promised.id), failure: null };

	let parsed;
	try {
		parsed = JSON.parse(files[RECORD_FILE]);
	} catch {
		return { ok: false, record: null, failure: `${RECORD_FILE} did not come back as JSON` };
	}
	if (parsed?.id !== promised.id)
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
