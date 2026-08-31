import { ROOT, WIDGETS_DIR } from "./paths.js";
import { readIndex } from "./engine/catalogue-index.js";
import { readLock, lockEntry, withEntry, withoutEntry } from "./engine/widget-lock.js";
import { commitUrl, folderFor, rawUrl, readRepository } from "./engine/github.js";

export const INDEX_PATH = `${ROOT}/catalogue.json`;
export const LOCK_PATH = `${ROOT}/widgets.lock.json`;

const NEEDED = "manifest.json";

function refuse(failure) {
	return { ok: false, failure };
}

// EVERYTHING THAT REACHES OUT IS HANDED IN, so the whole flow is provable without a network:
// fetchJson and fetchText are the only two doors, and a test drives them itself.
export function createInstaller({ adapter, fetchJson, fetchText }) {
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

	return {
		async available() {
			return readIndex(await readJson(INDEX_PATH, null));
		},

		async lock() {
			return readLock(await readJson(LOCK_PATH, null));
		},

		async install(listed) {
			const manifest = listed?.manifest ?? {};
			const repository = readRepository(manifest.repository);
			if (!repository) return refuse("this entry names no repository to fetch from");

			const folder = folderFor(WIDGETS_DIR, manifest.id);
			if (!folder) return refuse(`"${manifest.id}" is not a scoped widget id`);

			const wanted = Array.isArray(manifest.files) && manifest.files.length > 0 ? manifest.files : [NEEDED, "widget.jsx"];
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

			await adapter.mkdir(folder);
			for (const [name, text] of Object.entries(files)) await adapter.write(`${folder}/${name}`, text);
			await writeJson(LOCK_PATH, withEntry(await this.lock(), manifest.id, lockEntry({ source: manifest.repository, commit, files })));
			return { ok: true, id: manifest.id, commit, failure: null };
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
