import { ROOT, WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import {
	LEGACY_RECORD_FILE,
	RECORD_FILE,
	cardOf,
	firstDifferingCardKey,
	mergeCatalogue,
	readIndex,
	recordIn,
} from "./engine/catalogue-index.js";
import { compatibility } from "./engine/compatibility.js";
import { generationOf, widgetKeyOf, widgetRef } from "./engine/widget-ref.js";
import {
	INSTALL_PENDING,
	commitsOf,
	readLock,
	lockEntry,
	withBuild,
	withEntry,
	withModule,
	withoutEntry,
	releaseModules,
} from "./engine/widget-lock.js";
import { createModuleSpace, declaredDependencies } from "./engine/modules.js";
import { createBuilder } from "./engine/builder.js";
import { createWidgetSource, scopeOf } from "./engine/widget-source.js";
import { folderFor, idOfFolder } from "./engine/github.js";
import { namesAFolderOnThisMachine, sourcesOf } from "./sources.js";
import { SHIPPED_SOURCES } from "./registries.js";

export const INDEX_PATH = `${ROOT}/catalogue.json`;
export { LOCK_PATH };

const CARD_DIFFERS = "{widget}'s card says one thing about {key} and its code another, so it was not installed";

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
	declaredIn = null,
}) {
	const space = createModuleSpace({ adapter, fetchText });
	const widgets = createWidgetSource({ fetchJson, fetchText, disk });
	const builder = createBuilder({ adapter, space });

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

	async function writeWidget(folder, files, made) {
		await adapter.mkdir(scopeOf(folder));
		await adapter.mkdir(folder);
		for (const [name, text] of Object.entries(files)) await adapter.write(`${folder}/${name}`, text);
		if (made.built.from) await builder.writeBuild(folder, made.built, made.css);
	}

	function whatTheScopeIsAboutToGet(folder, scope) {
		const held = {};
		for (const [name, text] of Object.entries(scope ?? {})) held[`${scopeOf(folder)}/${name}`] = text;
		return held;
	}

	async function writeWhatTheScopeShares(folder, scope) {
		for (const [name, text] of Object.entries(scope)) await adapter.write(`${scopeOf(folder)}/${name}`, text);
	}

	async function everyWidgetFolder() {
		const found = [];
		for (const scope of (await adapter.list(WIDGETS_DIR)).folders) found.push(...(await adapter.list(scope)).folders);
		return found;
	}

	async function rebuiltIfDrifted(lock, folder) {
		const id = idOfFolder(folder);
		if (!id) return null;

		const files = await builder.sourceAndSheetsAt(folder);
		if (files === null) return null;
		if (await builder.isCurrent(lock.builds[id] ?? null, folder, files)) return null;

		return { id, ...(await builder.rebuild(lock, id, folder, files)) };
	}

	async function installedCard(id) {
		const folder = folderFor(WIDGETS_DIR, id);
		return (
			(await readJson(`${folder}/${RECORD_FILE}`, null)) ?? (await readJson(`${folder}/${LEGACY_RECORD_FILE}`, null))
		);
	}

	function servedCard(files) {
		try {
			return JSON.parse(recordIn(files) ?? "null");
		} catch {
			return null;
		}
	}

	const generationsIn = (lock, key) => Object.keys(lock.widgets).filter((id) => widgetKeyOf(id) === key);

	async function placementForUpdate(lock, key, held) {
		const newest = generationsIn(lock, key).at(-1);
		if (!newest) return { id: key, commits: [], isAbsorbed: false, isNewGeneration: false };
		const verdict = compatibility(await installedCard(newest), servedCard(held.files));
		if (verdict.isCompatible)
			return { id: newest, commits: commitsOf(lock.widgets[newest]), isAbsorbed: true, isNewGeneration: false };
		return { id: widgetRef(key, held.commit), commits: [], isAbsorbed: false, isNewGeneration: true };
	}

	async function placementForSharedCommit(lock, key, held) {
		const written = servedCard(held.files);
		for (const id of generationsIn(lock, key)) {
			if (compatibility(written, await installedCard(id)).isCompatible)
				return { id, commits: commitsOf(lock.widgets[id]), isAbsorbed: true, isNewGeneration: false };
		}
		const isNewGeneration = generationsIn(lock, key).length > 0;
		return { id: isNewGeneration ? widgetRef(key, held.commit) : key, commits: [], isAbsorbed: false, isNewGeneration };
	}

	async function cardMismatchIn(held) {
		const served = servedCard(held.files);
		if (!served || !declaredIn) return null;
		const declared = await declaredIn(held);
		const differs = declared ? firstDifferingCardKey(cardOf(declared, served.api), served) : null;
		return differs ? CARD_DIFFERS.replace("{widget}", held.record.id).replace("{key}", differs) : null;
	}

	async function absorbCommit(lock, id, commit) {
		const entry = lock.widgets[id];
		await writeJson(LOCK_PATH, withEntry(lock, id, { ...entry, commits: [...new Set([...commitsOf(entry), commit])] }));
		return { ok: true, id, commit, isNewGeneration: false, failure: null };
	}

	async function madeFor(lock, id, held) {
		const resolved = await withDependencies(lock, id, held.record);
		if (!resolved.ok) return resolved;
		const folder = folderFor(WIDGETS_DIR, id);
		return builder.make({
			lock: resolved.lock,
			id,
			folder,
			files: held.files,
			aboutToBeWritten: whatTheScopeIsAboutToGet(folder, held.scope),
		});
	}

	async function writeGeneration({ listed, held, placed, made }) {
		const id = placed.id;
		const folder = folderFor(WIDGETS_DIR, id);
		const source = listed?.origin ?? listed?.manifest?.repository;
		const described = {
			source,
			commit: held.commit,
			files: held.files,
			path: listed?.manifest?.path ?? null,
			commits: placed.commits,
		};
		await writeJson(LOCK_PATH, withEntry(made.lock, id, lockEntry({ ...described, state: INSTALL_PENDING })));
		await writeWidget(folder, held.files, made);
		await writeWhatTheScopeShares(folder, held.scope);
		await writeJson(LOCK_PATH, withBuild(withEntry(made.lock, id, lockEntry(described)), id, made.record));
	}

	async function installPlaced(listed, held, placed) {
		const mismatch = await cardMismatchIn(held);
		if (mismatch) return refuse(mismatch);
		const made = await madeFor(readLock(await readJson(LOCK_PATH, null)), placed.id, held);
		if (!made.ok) return refuse(made.failure);
		await writeGeneration({ listed, held, placed, made });
		return { ok: true, id: placed.id, commit: held.commit, isNewGeneration: placed.isNewGeneration, failure: null };
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

		async rebuildDrifted() {
			if (!(await adapter.exists(WIDGETS_DIR))) return { rebuilt: [], failures: [] };

			let lock = await this.lock();
			const rebuilt = [];
			const failures = [];
			for (const folder of await everyWidgetFolder()) {
				const made = await rebuiltIfDrifted(lock, folder);
				if (made === null) continue;
				if (!made.ok) failures.push({ id: made.id, failure: made.failure });
				else {
					lock = made.lock;
					rebuilt.push(made.id);
				}
			}
			if (rebuilt.length > 0) await writeJson(LOCK_PATH, lock);
			for (const each of failures) console.error(`[widgetarium] ${each.id} did not build: ${each.failure}`);
			return { rebuilt, failures };
		},

		async install(listed, onStep) {
			const held = await widgets.filesOf(listed, onStep);
			if (!held.ok) return refuse(held.failure);
			return installPlaced(listed, held, await placementForUpdate(await this.lock(), held.record.id, held));
		},

		async installAt(ref, offers) {
			const key = widgetKeyOf(ref);
			const offer = offers.find((entry) => entry.manifest?.id === key);
			if (!offer) return refuse(`no source this vault reads offers ${key}`);
			const listed = { ...offer, manifest: { ...offer.manifest, ref: generationOf(ref) } };
			const held = await widgets.filesOf(listed);
			if (!held.ok) return refuse(held.failure);
			const lock = await this.lock();
			const placed = await placementForSharedCommit(lock, key, held);
			return placed.isAbsorbed ? absorbCommit(lock, placed.id, held.commit) : installPlaced(listed, held, placed);
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
