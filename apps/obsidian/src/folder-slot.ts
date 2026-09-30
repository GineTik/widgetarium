import { TFile, TFolder } from "obsidian";
import type { App } from "obsidian";
import { fieldsOf } from "@widgetarium/core/gateway/fields.js";
import type { FieldReport } from "@widgetarium/core/gateway/fields.js";
import { isMatch, pageOf } from "@widgetarium/core/gateway/match.js";
import type { DuplicateIdReport, FilterRow, SortRow, Unsubscribe } from "@widgetarium/core/gateway/contract.js";
import type { SlotWrite } from "@widgetarium/core/gateway/obsidian.js";
import { readBody } from "@widgetarium/core/block-writer.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { Frontmatter } from "@widgetarium/core/note-mark.js";
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
import type { NoteAddress, VaultNoteRecord } from "./vault-record.js";

export interface SlotBinding {
	readonly path?: string;
}

export interface FolderQuery {
	readonly where?: readonly FilterRow[];
	readonly sort?: readonly SortRow[];
	readonly offset?: number | undefined;
	readonly limit?: number | undefined;
}

export interface FolderRows {
	readonly rows: VaultNoteRecord[];
	readonly total: number;
	readonly duplicates: DuplicateIdReport[];
}

export interface FolderSlot {
	readonly binding: SlotBinding | null | undefined;
	readonly canCreate: boolean;
	readonly canRepairIds: boolean;
	readonly canUpdate: boolean;
	readonly canRemove: boolean;
	readonly canSubscribe: true;
	readonly canDescribe: true;
	list(query?: FolderQuery): Promise<FolderRows>;
	get(ref: NoteAddress): Promise<VaultNoteRecord | null>;
	describe(): Promise<FieldReport[]>;
	subscribe(callback: (event: NoteAddress) => void): Unsubscribe;
	create?: (draft: SlotWrite) => Promise<VaultNoteRecord>;
	update?: (ref: NoteAddress, patch: SlotWrite) => Promise<VaultNoteRecord | null>;
	repairIds?: () => Promise<number>;
	remove?: (ref: NoteAddress) => Promise<void>;
}

interface DuplicatesOncePerId {
	now(): DuplicateIdReport[];
	read(held: readonly VaultNoteRecord[]): DuplicateIdReport[];
	reminted(path: string): void;
}

type ReadFolder = () => VaultNoteRecord[];

export function createSlot(app: App, binding: SlotBinding | null | undefined): FolderSlot {
	const folderPath = binding?.path ?? "";
	const writable = Boolean(folderPath);
	const readFolder = (): VaultNoteRecord[] => readFolderWithSubfolders(app, folderPath);
	const duplicates = duplicatesReportedOncePerId(readFolder);

	const slot: FolderSlot = {
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
			return { rows: pageOf(rows, pageAskedBy(query)), total: rows.length, duplicates: found };
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
	return {
		...slot,
		create: createRecordIn(app, folderPath),
		update: updateRecordIn(app, folderPath, duplicates),
		repairIds: repairIdsIn(app, readFolder),
		remove: removeRecordFrom(app),
	};
}

export function pathOfEventFile(file: unknown): string | undefined {
	if (!isObject(file)) return undefined;
	const path = file["path"];
	return typeof path === "string" ? path : undefined;
}

function pageAskedBy(query: FolderQuery): { offset?: number; limit?: number } {
	return {
		...(query.offset === undefined ? {} : { offset: query.offset }),
		...(query.limit === undefined ? {} : { limit: query.limit }),
	};
}

function readFolderWithSubfolders(app: App, folderPath: string): VaultNoteRecord[] {
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return [];
	const found: VaultNoteRecord[] = [];
	const walk = (node: TFolder): void => {
		for (const child of node.children) {
			if (child instanceof TFolder) walk(child);
			else if (child instanceof TFile && child.extension === "md") found.push(toRecord(app, child));
		}
	};
	walk(folder);
	return found;
}

function duplicatesReportedOncePerId(readFolder: ReadFolder): DuplicatesOncePerId {
	const alreadyReported = new Set<string>();
	let lastRead: DuplicateIdReport[] | null = null;
	const now = (): DuplicateIdReport[] => lastRead ?? duplicateIds(readFolder());
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

function subscribeToFolder(app: App, folderPath: string, callback: (event: NoteAddress) => void): Unsubscribe {
	const handler = (file: unknown): void => {
		const path = pathOfEventFile(file);
		if (path?.startsWith(folderPath)) callback({ path });
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

function propsIn(write: SlotWrite): Frontmatter {
	return isObject(write.props) ? write.props : {};
}

function createRecordIn(app: App, folderPath: string): (draft: SlotWrite) => Promise<VaultNoteRecord> {
	return async (draft) => {
		const props = propsIn(draft);
		const title = draft.name ?? props["title"] ?? props["name"] ?? "Untitled";
		const path = `${folderPath}/${slugify(title)}.md`;
		await createFolderUnlessThere(app, folderPath);
		const body = draft.body ? `\n${String(draft.body)}\n` : "\n";
		const file = await app.vault.create(path, stringifyFrontmatter(withId(props, mintId())) + body);
		const bodyThatLanded = draft.body === undefined ? undefined : readBody(await app.vault.read(file));
		return toRecord(app, file, bodyThatLanded);
	};
}

async function createFolderUnlessThere(app: App, folderPath: string): Promise<void> {
	if (app.vault.getAbstractFileByPath(folderPath) instanceof TFolder) return;
	await app.vault.createFolder(folderPath);
}

function updateRecordIn(
	app: App,
	folderPath: string,
	duplicates: DuplicatesOncePerId,
): (ref: NoteAddress, patch: SlotWrite) => Promise<VaultNoteRecord | null> {
	return async (ref, patch) => {
		const found = app.vault.getAbstractFileByPath(ref.path);
		if (!(found instanceof TFile)) return null;
		const remint = mustRemint(duplicates.now(), found.path);
		// TRADE-OFF: minted once and carried into the write, because minting again inside processFrontMatter meant readers spent the whole flight on an id the vault would never hold
		const mintedId = remint ? mintId() : null;
		const patched = { ...(frontmatterOf(app, found) ?? {}), ...propsIn(patch) };
		const wasAt = found.path;
		let written = mintedId ? withId(patched, mintedId) : patched;
		const giveUpTheIntent = intendWrite(wasAt, written);
		try {
			const file = patch.name === undefined ? found : await renameNote(app, folderPath, found, patch.name);
			carryIntentAcrossRename(wasAt, file.path);
			if (patch.props || remint) {
				await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
					Object.assign(frontmatter, propsIn(patch));
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

async function renameNote(app: App, folderPath: string, file: TFile, name: unknown): Promise<TFile> {
	const wanted = `${folderPath}/${slugify(name)}.md`;
	if (wanted === file.path) return file;
	await app.fileManager.renameFile(file, wanted);
	const renamed = app.vault.getAbstractFileByPath(wanted);
	return renamed instanceof TFile ? renamed : file;
}

function repairIdsIn(app: App, readFolder: ReadFolder): () => Promise<number> {
	return async () => {
		const duplicates = duplicateIds(readFolder());
		let minted = 0;
		for (const entry of duplicates) {
			for (const path of entry.remints) {
				const file = app.vault.getAbstractFileByPath(path);
				if (!(file instanceof TFile)) continue;
				await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) =>
					Object.assign(frontmatter, withId(frontmatter, mintId())),
				);
				minted += 1;
			}
		}
		return minted;
	};
}

function removeRecordFrom(app: App): (ref: NoteAddress) => Promise<void> {
	return async (ref) => {
		const file = app.vault.getAbstractFileByPath(ref.path);
		if (file instanceof TFile) await app.fileManager.trashFile(file);
	};
}
