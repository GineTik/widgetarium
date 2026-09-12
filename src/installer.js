import { ROOT, WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import { RECORD_FILE, readIndex, readRecord } from "./engine/catalogue-index.js";
import { readLock, lockEntry, withEntry, withModule, withoutEntry, releaseModules } from "./engine/widget-lock.js";
import { createModuleSpace, declaredDependencies } from "./engine/modules.js";
import { BUILD_FILE, SHEET_FILES, SOURCE_FILES, compileWidget, sourceFileIn } from "./engine/widget-build.js";
import { commitUrl, folderFor, idOfFolder, rawUrl, readRepository, treeUrl } from "./engine/github.js";
import { apiRefusal } from "./version.js";

export const INDEX_PATH = `${ROOT}/catalogue.json`;
export { LOCK_PATH };

// CONTEXT: a widget travels with its own sheet; a lib and a palette belong to the whole scope
const WIDGET_FILES = [RECORD_FILE, ...SOURCE_FILES, ...SHEET_FILES];
const SCOPE_FILES = ["lib.js", "tokens.css"];

function scopeOf(folder) {
	return folder.slice(0, folder.lastIndexOf("/"));
}

function buildOf(files, folder) {
	const from = sourceFileIn(files);
	if (!from) return { ok: true, from: null, code: null, failure: null };
	try {
		return { ok: true, from, code: compileWidget(files[from], `${folder}/${from}`), failure: null };
	} catch (failure) {
		return { ok: false, from: null, code: null, failure: `${from} did not compile: ${String(failure?.message ?? failure)}` };
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
	if (parsed?.id !== promised.id) return { ok: false, record: null, failure: `the repository served "${parsed?.id}" under "${promised.id}"` };
	return { ok: true, record: readRecord(parsed, promised.id), failure: null };
}

const isNamed = (held) => typeof held === "string" && held !== "";
const namesARepository = (source) => isNamed(source?.repository);
const namesAFolderOnThisMachine = (source) => !namesARepository(source) && isNamed(source?.path);
const isReachableSource = (source) => namesARepository(source) || namesAFolderOnThisMachine(source);

function refuse(failure) {
	// CONTEXT: `@scope/name/manifest.json` is the shape both a folder and a repository hold
	return { ok: false, failure };
}

// EVERYTHING THAT REACHES OUT IS HANDED IN, so the whole flow is provable without a network:
// fetchJson and fetchText are the only two doors, and a test drives them itself.
// CONTEXT: the vault IS the installed set, so a folder source is a path on the machine, not in it
export function createInstaller({ adapter, fetchJson, fetchText, disk }) {
	const space = createModuleSpace({ adapter, fetchText });

	const readJson = async (path, fallback) => {
		if (!(await adapter.exists(path))) return fallback;
		try {
			return JSON.parse(await adapter.read(path));
		} catch (failure) {
			console.error(`[widgetarium] cannot read ${path}`, failure);
			return fallback;
		}
	};

	const writeJson = (path, value) => adapter.write(path, `${JSON.stringify(value, null, "\t")}\n`);

	const readCatalogue = async () => {
		const raw = await readJson(INDEX_PATH, null);
		return { raw, sources: (Array.isArray(raw?.sources) ? raw.sources : []).filter(isReachableSource) };
	};

	// CONTEXT: the card draws the widget, so its code travels with the offer, not only its name
	async function codeAt(folder, scope) {
		const held = {};
		for (const name of SOURCE_FILES) {
			const at = `${folder}/${name}`;
			if (!held.code && (await disk.exists(at))) Object.assign(held, { code: await disk.read(at), path: at });
		}
		if (!held.code) return held;

		const libAt = `${scope}/lib.js`;
		if (await disk.exists(libAt)) Object.assign(held, { lib: await disk.read(libAt), libPath: libAt, scope: scope.slice(scope.lastIndexOf("/") + 1) });
		return held;
	}

	async function writeWidget(folder, files, built) {
		await adapter.mkdir(scopeOf(folder));
		await adapter.mkdir(folder);
		for (const [name, text] of Object.entries(files)) await adapter.write(`${folder}/${name}`, text);
		if (built.from) await adapter.write(`${folder}/${BUILD_FILE}`, built.code);
	}

	async function withDependencies(lock, id, manifest) {
		let held = lock;
		for (const [name, range] of declaredDependencies(manifest)) {
			const found = await space.take(held, name, range);
			if (!found.ok) return { ok: false, lock: held, failure: found.failure };
			held = withModule(held, id, found);
		}
		return { ok: true, lock: held, failure: null };
	}

	async function recordAt(folder) {
		const at = `${folder}/${RECORD_FILE}`;
		if (!(await disk.exists(at))) return readRecord(null, idOfFolder(folder));
		try {
			return readRecord(JSON.parse(await disk.read(at)), idOfFolder(folder));
		} catch (failure) {
			console.error(`[widgetarium] cannot read ${at}`, failure);
			return null;
		}
	}

	async function discoverFolder(source) {
		// CONTEXT: reading a folder outside the vault is a desktop power; a phone has no such door
		if (!disk || !(await disk.exists(source.path))) return [];
		const found = [];
		for (const scope of await disk.folders(source.path)) {
			for (const folder of await disk.folders(scope)) {
				const held = await codeAt(folder, scope);
				if (!held.code) continue;
				const manifest = await recordAt(folder);
				if (manifest?.id) found.push({ manifest, installed: false, origin: source.path, from: { folder }, ...held });
			}
		}
		return found;
	}

	async function discoverRepository(source) {
		const repository = readRepository(source.repository);
		if (!repository) return [];
		try {
			const commit = String((await fetchJson(commitUrl(repository, source.ref)))?.sha ?? "");
			if (!commit) return [];
			const under = source.path ? `${source.path}/` : "";
			const tree = (await fetchJson(treeUrl(repository, commit)))?.tree ?? [];
			const found = [];
			for (const node of tree) {
				if (!node?.path?.startsWith(under) || !node.path.endsWith(`/${RECORD_FILE}`)) continue;
				const folder = node.path.slice(0, -RECORD_FILE.length - 1);
				const manifest = JSON.parse(await fetchText(rawUrl(repository, commit, node.path)));
				if (manifest?.id) {
					found.push({ manifest: { ...manifest, repository: source.repository, ref: source.ref, path: folder }, installed: false, origin: source.repository });
				}
			}
			return found;
		} catch (failure) {
			console.error(`[widgetarium] cannot read ${source.repository}`, failure);
			return [];
		}
	}

	// CONTEXT: a folder source is on the machine, so installing it is a copy INTO the vault
	async function copyIn(listed) {
		const manifest = listed.manifest ?? {};
		const folder = folderFor(WIDGETS_DIR, manifest.id);
		if (!folder) return refuse(`"${manifest.id}" is not a scoped widget id`);
		if (!disk) return refuse("this build cannot read a folder outside the vault");
		const refusal = apiRefusal(manifest);
		if (refusal) return refuse(refusal);

		const files = {};
		for (const name of WIDGET_FILES) {
			const at = `${listed.from.folder}/${name}`;
			if (await disk.exists(at)) files[name] = await disk.read(at);
		}
		if (!sourceFileIn(files)) return refuse(`${listed.from.folder} holds no widget source`);

		const built = buildOf(files, folder);
		if (!built.ok) return refuse(built.failure);

		const resolved = await withDependencies(readLock(await readJson(LOCK_PATH, null)), manifest.id, manifest);
		if (!resolved.ok) return refuse(resolved.failure);

		await writeWidget(folder, files, built);

		// CONTEXT: a widget importing its scope's lib is broken without it, so the scope comes along
		for (const name of SCOPE_FILES) {
			const at = `${scopeOf(listed.from.folder)}/${name}`;
			if (await disk.exists(at)) await adapter.write(`${scopeOf(folder)}/${name}`, await disk.read(at));
		}

		await writeJson(LOCK_PATH, withEntry(resolved.lock, manifest.id, lockEntry({ source: listed.origin, commit: "local", files, builtFrom: built.from })));
		return { ok: true, id: manifest.id, commit: "local", failure: null };
	}

	return {
		// A SOURCE IS A PLACE, NOT A LIST: name a folder or a repository and the widgets in it are
		// found by reading it, so adding a widget never means editing an index by hand.
		async discover(source) {
			if (!source?.path && !source?.repository) return [];
			return source.repository ? discoverRepository(source) : discoverFolder(source);
		},

		async folderSourcePaths() {
			return (await readCatalogue()).sources.filter(namesAFolderOnThisMachine).map((source) => source.path);
		},

		// TRADE-OFF: one unreadable source is skipped rather than emptying the catalogue with it
		async offersFrom(source) {
			try {
				return await this.discover(source);
			} catch (failure) {
				console.error(`[widgetarium] cannot read the source ${source.repository ?? source.path}`, failure);
				return [];
			}
		},

		async available() {
			const { raw, sources } = await readCatalogue();
			const listed = readIndex(raw);
			const found = [];
			for (const source of sources) {
				found.push(...(await this.offersFrom(source)));
			}
			const known = new Set(listed.map((entry) => entry.manifest?.id));
			return [...listed, ...found.filter((entry) => !known.has(entry.manifest?.id))];
		},

		async lock() {
			return readLock(await readJson(LOCK_PATH, null));
		},

		async install(listed, onStep) {
			const manifest = listed?.manifest ?? {};
			if (listed?.from?.folder) return copyIn(listed);

			const repository = readRepository(manifest.repository);
			if (!repository) return refuse("this entry names no repository to fetch from");

			const folder = folderFor(WIDGETS_DIR, manifest.id);
			if (!folder) return refuse(`"${manifest.id}" is not a scoped widget id`);

			const wanted = Array.isArray(manifest.files) && manifest.files.length > 0 ? manifest.files : WIDGET_FILES;
			if (!SOURCE_FILES.some((name) => wanted.includes(name))) return refuse("the entry lists no widget source");

			let commit;
			const files = {};
			try {
				commit = String((await fetchJson(commitUrl(repository, manifest.ref)))?.sha ?? "");
				if (!commit) return refuse("the repository named no commit for that ref");
				onStep?.({ done: 0, total: wanted.length });
				for (const [at, name] of wanted.entries()) {
					files[name] = await fetchText(rawUrl(repository, commit, `${manifest.path ?? folder}/${name}`));
					onStep?.({ done: at + 1, total: wanted.length });
				}
			} catch (failure) {
				return refuse(String(failure?.message ?? failure));
			}

			const served = recordServedUnder(files, manifest);
			if (!served.ok) return refuse(served.failure);
			const refusal = apiRefusal(served.record);
			if (refusal) return refuse(refusal);

			const built = buildOf(files, folder);
			if (!built.ok) return refuse(built.failure);

			const resolved = await withDependencies(await this.lock(), manifest.id, served.record);
			if (!resolved.ok) return refuse(resolved.failure);

			await writeWidget(folder, files, built);
			await writeJson(LOCK_PATH, withEntry(resolved.lock, manifest.id, lockEntry({ source: manifest.repository, commit, files, builtFrom: built.from })));
			return { ok: true, id: manifest.id, commit, failure: null };
		},

		async installEvery(listed, onStep) {
			for (const entry of listed) {
				onStep?.(entry?.manifest?.id);
				const done = await this.install(entry);
				if (!done.ok) return done;
			}
			return { ok: true, failure: null };
		},

		async uninstall(id) {
			const lock = await this.lock();
			// CONTEXT: a widget nobody installed is one the person wrote — never ours to remove
			if (!lock.widgets[id]) return refuse("that widget was not installed from a repository");

			const folder = folderFor(WIDGETS_DIR, id);
			for (const name of Object.keys(lock.widgets[id].files ?? {})) {
				if (await adapter.exists(`${folder}/${name}`)) await adapter.remove(`${folder}/${name}`);
			}
			if (await adapter.exists(folder)) await adapter.rmdir(folder, true);

			const released = releaseModules(lock, id);
			for (const key of released.collected) await space.collect(key);
			await writeJson(LOCK_PATH, withoutEntry(released.lock, id));
			return { ok: true, id, failure: null };
		},
	};
}
