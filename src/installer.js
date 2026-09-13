import { ROOT, WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import { mergeCatalogue, readIndex } from "./engine/catalogue-index.js";
import { readLock, lockEntry, withEntry, withModule, withoutEntry, releaseModules } from "./engine/widget-lock.js";
import { createModuleSpace, declaredDependencies } from "./engine/modules.js";
import { BUILD_FILE, compileWidget, sourceFileIn } from "./engine/widget-build.js";
import { createWidgetSource, scopeOf } from "./engine/widget-source.js";
import { folderFor } from "./engine/github.js";
import { namesAFolderOnThisMachine, sourcesOf } from "./sources.js";
import { SHIPPED_SOURCES } from "./registries.js";

export const INDEX_PATH = `${ROOT}/catalogue.json`;
export { LOCK_PATH };

function buildOf(files, folder) {
	const from = sourceFileIn(files);
	if (!from) return { ok: true, from: null, code: null, failure: null };
	try {
		return { ok: true, from, code: compileWidget(files[from], `${folder}/${from}`), failure: null };
	} catch (failure) {
		return {
			ok: false,
			from: null,
			code: null,
			failure: `${from} did not compile: ${String(failure?.message ?? failure)}`,
		};
	}
}

function refuse(failure) {
	return { ok: false, failure };
}

export function createInstaller({
	adapter,
	fetchJson,
	fetchText,
	disk,
	readAdded = async () => [],
	shipped = SHIPPED_SOURCES,
}) {
	const space = createModuleSpace({ adapter, fetchText });
	const widgets = createWidgetSource({ fetchJson, fetchText, disk });

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
		const legacy = await readJson(INDEX_PATH, null);
		return { raw: legacy, sources: sourcesOf({ added: await readAdded(), legacy, shipped }) };
	};

	async function writeWidget(folder, files, built) {
		await adapter.mkdir(scopeOf(folder));
		await adapter.mkdir(folder);
		for (const [name, text] of Object.entries(files)) await adapter.write(`${folder}/${name}`, text);
		if (built.from) await adapter.write(`${folder}/${BUILD_FILE}`, built.code);
	}

	async function writeWhatTheScopeShares(folder, scope) {
		for (const [name, text] of Object.entries(scope)) await adapter.write(`${scopeOf(folder)}/${name}`, text);
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

	return {
		// A SOURCE IS A PLACE, NOT A LIST: name a folder or a repository and the widgets in it are
		// found by reading it, so adding a widget never means editing an index by hand.
		async discover(source) {
			return widgets.offersFrom(source);
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
			return mergeCatalogue(listed, found);
		},

		async lock() {
			return readLock(await readJson(LOCK_PATH, null));
		},

		async install(listed, onStep) {
			const held = await widgets.filesOf(listed, onStep);
			if (!held.ok) return refuse(held.failure);

			const id = held.record.id;
			const folder = folderFor(WIDGETS_DIR, id);
			const built = buildOf(held.files, folder);
			if (!built.ok) return refuse(built.failure);

			const resolved = await withDependencies(await this.lock(), id, held.record);
			if (!resolved.ok) return refuse(resolved.failure);

			await writeWidget(folder, held.files, built);
			await writeWhatTheScopeShares(folder, held.scope);
			const from = listed?.origin ?? listed?.manifest?.repository;
			await writeJson(
				LOCK_PATH,
				withEntry(
					resolved.lock,
					id,
					lockEntry({ source: from, commit: held.commit, files: held.files, builtFrom: built.from }),
				),
			);
			return { ok: true, id, commit: held.commit, failure: null };
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
