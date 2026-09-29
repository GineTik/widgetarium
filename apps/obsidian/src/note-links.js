import { TFile } from "obsidian";
import { readLink } from "@widgetarium/core/engine/link.js";
import { readTarget, refuseRead } from "@widgetarium/core/engine/read-file.js";

const LEAF_OF_TARGET = { self: false, blank: "tab" };

export function createNavigator(app, from) {
	const find = (link) => findByLink(app, from, link);

	return {
		canNavigate: true,
		resolve: (link) => find(link)?.path ?? null,
		navigate: (link, { target = "self" } = {}) => {
			const leaf = LEAF_OF_TARGET[target];
			if (leaf === undefined) {
				console.error(`[widgetarium] navigate refused: "${target}" is not a target, only self or blank`);
				return false;
			}
			const file = find(link);
			if (!(file instanceof TFile)) return false;
			app.workspace.getLeaf(leaf).openFile(file);
			return true;
		},
	};
}

export function createReader(app, from) {
	return {
		canRead: true,
		// TRADE-OFF: the cap is asked before the read — a refusal after loading 200 MB is not one
		async read(link, options = {}) {
			const target = readTarget(link);
			if (!target.ok) return refuseRead(target.failure);

			const found = findByLink(app, from, target.link);
			if (!found) return refuseRead(`${target.link} is not in this vault`);
			if (!(found instanceof TFile)) return refuseRead(`${found.path} is a folder, not a file`, found.path);

			const bytes = found.stat?.size ?? 0;
			const cap = Number(options.maxBytes ?? 0);
			if (cap > 0 && bytes > cap) {
				return refuseRead(
					`${found.path} is ${Math.round(bytes / 1024)} KB, over the ${Math.round(cap / 1024)} KB limit`,
					found.path,
					bytes,
				);
			}
			return { ok: true, text: await app.vault.cachedRead(found), path: found.path, bytes, failure: null };
		},
	};
}

function findByLink(app, from, link) {
	const parsed = readLink(link);
	if (!parsed) return null;
	if (!parsed.rooted) return app.metadataCache.getFirstLinkpathDest(parsed.path, from) ?? null;
	const direct = app.vault.getAbstractFileByPath(parsed.path);
	return direct ?? app.vault.getAbstractFileByPath(`${parsed.path}.md`) ?? null;
}
