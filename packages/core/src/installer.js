import { LOCK_PATH } from "./paths.js";
import { mergeCatalogue, readIndex } from "./engine/catalogue-index.js";
import { generationOf, widgetKeyOf } from "./engine/widget-ref.js";
import { readLock } from "./engine/widget-lock.js";
import { namesAFolderOnThisMachine } from "./sources.js";
import { INDEX_PATH, installerContext, refuse } from "./installer-context.js";
import { placementForSharedCommit, placementForUpdate } from "./installer-placement.js";
import { absorbCommit, installPlaced } from "./installer-writing.js";
import { rebuildDrifted, uninstall } from "./installer-upkeep.js";

export { INDEX_PATH, LOCK_PATH };

export function createInstaller(options) {
	const installing = installerContext(options);
	const { widgets, readJson, readCatalogue } = installing;
	return {
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
			const found = [];
			for (const source of sources) found.push(...(await this.offersFrom(source)));
			return mergeCatalogue(readIndex(raw), found);
		},

		async lock() {
			return readLock(await readJson(LOCK_PATH, null));
		},

		async rebuildDrifted() {
			return rebuildDrifted(installing, () => this.lock());
		},

		async install(listed, onStep) {
			const held = await widgets.filesOf(listed, onStep);
			if (!held.ok) return refuse(held.failure);
			const placed = await placementForUpdate(installing, await this.lock(), held.record.id, held);
			return installPlaced(installing, listed, held, placed);
		},

		async installAt(ref, offers) {
			const key = widgetKeyOf(ref);
			const offer = offers.find((entry) => entry.manifest?.id === key);
			if (!offer) return refuse(`no source this vault reads offers ${key}`);
			const listed = { ...offer, manifest: { ...offer.manifest, ref: generationOf(ref) } };
			const held = await widgets.filesOf(listed);
			if (!held.ok) return refuse(held.failure);
			const lock = await this.lock();
			const placed = await placementForSharedCommit(installing, lock, key, held);
			if (placed.isAbsorbed) return absorbCommit(installing, lock, placed.id, held.commit);
			return installPlaced(installing, listed, held, placed);
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
			return uninstall(installing, await this.lock(), id);
		},
	};
}
