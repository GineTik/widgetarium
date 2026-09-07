import { ROOT, WIDGETS_DIR } from "./paths.js";
import { readIndex } from "./engine/catalogue-index.js";
import { readLock, lockEntry, withEntry, withoutEntry } from "./engine/widget-lock.js";
import { commitUrl, folderFor, rawUrl, readRepository, treeUrl } from "./engine/github.js";
import { apiRefusal } from "./version.js";

export const INDEX_PATH = `${ROOT}/catalogue.json`;
export const LOCK_PATH = `${ROOT}/widgets.lock.json`;

const NEEDED = "manifest.json";
// CONTEXT: a widget travels with its own sheet; a lib and a palette belong to the whole scope
const WIDGET_FILES = ["manifest.json", "widget.tsx", "widget.ts", "widget.jsx", "widget.js", "styles.css"];
const SCOPE_FILES = ["lib.js", "tokens.css"];

function scopeOf(folder) {
	return folder.slice(0, folder.lastIndexOf("/"));
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
		for (const name of ["widget.tsx", "widget.ts", "widget.jsx", "widget.js"]) {
			const at = `${folder}/${name}`;
			if (!held.code && (await disk.exists(at))) Object.assign(held, { code: await disk.read(at), path: at });
		}
		const libAt = `${scope}/lib.js`;
		if (await disk.exists(libAt)) Object.assign(held, { lib: await disk.read(libAt), libPath: libAt, scope: scope.slice(scope.lastIndexOf("/") + 1) });
		return held;
	}

	async function discoverFolder(source) {
		// CONTEXT: reading a folder outside the vault is a desktop power; a phone has no such door
		if (!disk || !(await disk.exists(source.path))) return [];
		const found = [];
		for (const scope of await disk.folders(source.path)) {
			for (const folder of await disk.folders(scope)) {
				const at = `${folder}/${NEEDED}`;
				if (!(await disk.exists(at))) continue;
				try {
					const manifest = JSON.parse(await disk.read(at));
					if (manifest?.id) found.push({ manifest, installed: false, origin: source.path, from: { folder }, ...(await codeAt(folder, scope)) });
				} catch (failure) {
					console.error(`[widgetarium] cannot read ${at}`, failure);
				}
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
				if (!node?.path?.startsWith(under) || !node.path.endsWith(`/${NEEDED}`)) continue;
				const folder = node.path.slice(0, -NEEDED.length - 1);
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
		if (!files[NEEDED]) return refuse(`${listed.from.folder} holds no ${NEEDED}`);

		// CONTEXT: mkdir makes ONE folder, so a scope nobody has installed into yet comes first
		await adapter.mkdir(scopeOf(folder));
		await adapter.mkdir(folder);
		for (const [name, text] of Object.entries(files)) await adapter.write(`${folder}/${name}`, text);

		// CONTEXT: a widget importing its scope's lib is broken without it, so the scope comes along
		for (const name of SCOPE_FILES) {
			const at = `${scopeOf(listed.from.folder)}/${name}`;
			if (await disk.exists(at)) await adapter.write(`${scopeOf(folder)}/${name}`, await disk.read(at));
		}

		const held = readLock(await readJson(LOCK_PATH, null));
		await writeJson(LOCK_PATH, withEntry(held, manifest.id, lockEntry({ source: listed.origin, commit: "local", files })));
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

		async install(listed) {
			const manifest = listed?.manifest ?? {};
			if (listed?.from?.folder) return copyIn(listed);

			const repository = readRepository(manifest.repository);
			if (!repository) return refuse("this entry names no repository to fetch from");

			const folder = folderFor(WIDGETS_DIR, manifest.id);
			if (!folder) return refuse(`"${manifest.id}" is not a scoped widget id`);

			const wanted = Array.isArray(manifest.files) && manifest.files.length > 0 ? manifest.files : WIDGET_FILES;
			if (!wanted.includes(NEEDED)) return refuse(`the entry does not list ${NEEDED}`);

			let commit;
			const files = {};
			try {
				commit = String((await fetchJson(commitUrl(repository, manifest.ref)))?.sha ?? "");
				if (!commit) return refuse("the repository named no commit for that ref");
				for (const name of wanted) {
					files[name] = await fetchText(rawUrl(repository, commit, `${manifest.path ?? folder}/${name}`));
				}
			} catch (failure) {
				return refuse(String(failure?.message ?? failure));
			}

			// THE ONE CHECK THAT MATTERS BEFORE ANY WRITE: what came back must be the widget the
			// index promised. A repository serving something else under a known id is the whole
			// attack this catalogue can actually see.
			let served;
			try {
				served = JSON.parse(files[NEEDED]);
			} catch {
				return refuse(`${NEEDED} did not come back as JSON`);
			}
			if (served.id !== manifest.id) return refuse(`the repository served "${served.id}" under "${manifest.id}"`);
			const refusal = apiRefusal(served);
			if (refusal) return refuse(refusal);

			// CONTEXT: mkdir makes ONE folder, so a scope nobody has installed into yet comes first
			await adapter.mkdir(scopeOf(folder));
			await adapter.mkdir(folder);
			for (const [name, text] of Object.entries(files)) await adapter.write(`${folder}/${name}`, text);
			await writeJson(LOCK_PATH, withEntry(await this.lock(), manifest.id, lockEntry({ source: manifest.repository, commit, files })));
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
			await writeJson(LOCK_PATH, withoutEntry(lock, id));
			return { ok: true, id, failure: null };
		},
	};
}
