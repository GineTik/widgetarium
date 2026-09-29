import { TFile, TFolder } from "obsidian";
import { fieldsOf } from "@widgetarium/core/gateway/fields.ts";
import { isMatch, pageOf } from "@widgetarium/core/gateway/match.ts";
import { readBody } from "@widgetarium/core/block-writer.js";
import {
	duplicateIds,
	mintId,
	mustRemint,
	reportDuplicates,
	withId,
	withoutRemint,
} from "@widgetarium/core/record-id.js";
import { carryIntentAcrossRename, frontmatterOf, intendWrite, landWrite } from "./note-frontmatter.js";
import { slugify, sortRecords, stringifyFrontmatter, toRecord, writeBody } from "./vault-record.js";

export function createSlot(app, binding) {
	const folderPath = binding?.path ?? "";
	const writable = Boolean(folderPath);
	const readFolder = () => readFolderWithSubfolders(app, folderPath);
	const duplicates = duplicatesReportedOncePerId(readFolder);

	const slot = {
		binding,
		canCreate: writable,
		canRepairIds: writable,
		canUpdate: writable,
		canRemove: writable,
		canSubscribe: true,
		canDescribe: true,

		async list(query = {}) {
			const held = readFolder();
			const found = duplicates.read(held);
			const rows = sortRecords(
				held.filter((record) => isMatch(record, query.where)),
				query.sort,
			);
			return { rows: pageOf(rows, query), total: rows.length, duplicates: found };
		},

		// TRADE-OFF: one note, so the read belongs here and never in list()
		async get(ref) {
			const file = app.vault.getAbstractFileByPath(ref.path);
			if (!(file instanceof TFile)) return null;
			return toRecord(app, file, readBody(await app.vault.cachedRead(file)));
		},

		async describe() {
			return fieldsOf(readFolder());
		},

		subscribe(callback) {
			return subscribeToFolder(app, folderPath, callback);
		},
	};

	if (!writable) return slot;
	slot.create = createRecordIn(app, folderPath);
	slot.update = updateRecordIn(app, folderPath, duplicates);
	slot.repairIds = repairIdsIn(app, readFolder);
	slot.remove = removeRecordFrom(app);
	return slot;
}

function readFolderWithSubfolders(app, folderPath) {
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return [];
	const found = [];
	const walk = (node) => {
		for (const child of node.children) {
			if (child instanceof TFolder) walk(child);
			else if (child instanceof TFile && child.extension === "md") found.push(toRecord(app, child));
		}
	};
	walk(folder);
	return found;
}

function duplicatesReportedOncePerId(readFolder) {
	const alreadyReported = new Set();
	let lastRead = null;
	const now = () => lastRead ?? duplicateIds(readFolder());
	return {
		now,
		read(held) {
			const duplicates = duplicateIds(held);
			lastRead = duplicates;
			reportDuplicates(
				duplicates.filter((entry) => !alreadyReported.has(entry.id)),
				(said) => {
					console.warn(said);
				},
			);
			for (const entry of duplicates) alreadyReported.add(entry.id);
			return duplicates;
		},
		reminted(path) {
			lastRead = withoutRemint(now(), path);
		},
	};
}

function subscribeToFolder(app, folderPath, callback) {
	const handler = (file) => {
		if (file?.path?.startsWith(folderPath)) callback({ path: file.path });
	};
	app.vault.on("create", handler);
	app.vault.on("delete", handler);
	app.vault.on("rename", handler);
	app.metadataCache.on("changed", handler);
	return () => {
		app.vault.off("create", handler);
		app.vault.off("delete", handler);
		app.vault.off("rename", handler);
		app.metadataCache.off("changed", handler);
	};
}

function createRecordIn(app, folderPath) {
	return async (draft) => {
		const title = draft.name ?? draft.props?.title ?? draft.props?.name ?? "Untitled";
		const path = `${folderPath}/${slugify(title)}.md`;
		await createFolderUnlessThere(app, folderPath);
		const body = draft.body ? `\n${draft.body}\n` : "\n";
		const file = await app.vault.create(path, stringifyFrontmatter(withId(draft.props ?? {}, mintId())) + body);
		const bodyThatLanded = draft.body === undefined ? undefined : readBody(await app.vault.read(file));
		return toRecord(app, file, bodyThatLanded);
	};
}

async function createFolderUnlessThere(app, folderPath) {
	if (app.vault.getAbstractFileByPath(folderPath) instanceof TFolder) return;
	await app.vault.createFolder(folderPath);
}

function updateRecordIn(app, folderPath, duplicates) {
	return async (ref, patch) => {
		const found = app.vault.getAbstractFileByPath(ref.path);
		if (!(found instanceof TFile)) return null;
		const remint = mustRemint(duplicates.now(), found.path);
		// TRADE-OFF: minted once and carried into the write, because minting again inside processFrontMatter meant readers spent the whole flight on an id the vault would never hold
		const mintedId = remint ? mintId() : null;
		const before = { ...(frontmatterOf(app, found) ?? {}) };
		const wasAt = found.path;
		let written = mintedId
			? withId({ ...before, ...(patch.props ?? {}) }, mintedId)
			: { ...before, ...(patch.props ?? {}) };
		const giveUpTheIntent = intendWrite(wasAt, written);
		try {
			const file = patch.name === undefined ? found : await renameNote(app, folderPath, found, patch.name);
			carryIntentAcrossRename(wasAt, file.path);
			if (patch.props || remint) {
				await app.fileManager.processFrontMatter(file, (frontmatter) => {
					Object.assign(frontmatter, patch.props ?? {});
					if (mintedId) Object.assign(frontmatter, withId(frontmatter, mintedId));
					written = { ...frontmatter };
				});
			}
			if (remint) duplicates.reminted(wasAt);
			landWrite(file.path, written);
			const bodyThatLanded = patch.body === undefined ? undefined : await writeBody(app, file, patch.body);
			return toRecord(app, file, bodyThatLanded);
		} catch (failure) {
			giveUpTheIntent();
			throw failure;
		}
	};
}

async function renameNote(app, folderPath, file, name) {
	const wanted = `${folderPath}/${slugify(name)}.md`;
	if (wanted === file.path) return file;
	await app.fileManager.renameFile(file, wanted);
	return app.vault.getAbstractFileByPath(wanted) ?? file;
}

function repairIdsIn(app, readFolder) {
	return async () => {
		const duplicates = duplicateIds(readFolder());
		let minted = 0;
		for (const entry of duplicates) {
			for (const path of entry.remints) {
				const file = app.vault.getAbstractFileByPath(path);
				if (!(file instanceof TFile)) continue;
				await app.fileManager.processFrontMatter(file, (frontmatter) =>
					Object.assign(frontmatter, withId(frontmatter, mintId())),
				);
				minted += 1;
			}
		}
		return minted;
	};
}

function removeRecordFrom(app) {
	return async (ref) => {
		const file = app.vault.getAbstractFileByPath(ref.path);
		if (file instanceof TFile) await app.fileManager.trashFile(file);
	};
}
