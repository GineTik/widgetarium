import type * as FsPromises from "node:fs/promises";
import type { PlatformPath } from "node:path";
import type { Component, TFile as ObsidianFile } from "obsidian";
import type { HostPlugin } from "../apps/obsidian/src/host.ts";
import type { SourceDisk } from "../packages/core/src/engine/source-disk.ts";
import type { DeclaredNeeds } from "../packages/core/src/gateway/resolve-needs.ts";

Object.assign(globalThis, { window: { setTimeout, clearTimeout, queueMicrotask } });

const { TFile, TFolder } = await import("obsidian");

export interface TaskProps {
	[field: string]: unknown;
}

export type TaskFile = ObsidianFile & { props: TaskProps };

export interface WalkCounters {
	folderWalk: number;
	toRecord: number;
	frontmatterWrites: number;
}

export interface DiskCounters {
	exists: number;
	read: number;
	folders: number;
}

type FileHandler = (file: TaskFile) => void;

interface Snapshot {
	readonly frontmatter: TaskProps;
	readonly embeds: readonly unknown[];
}

export interface TaskMetadataCache {
	getFileCache(file: TaskFile): Snapshot | undefined;
	emit(file: TaskFile): void;
	forget(file: TaskFile): boolean;
	on(name: string, handler: FileHandler): Set<FileHandler>;
	off(name: string, handler: FileHandler): boolean;
}

export interface TaskApp {
	readonly vault: ReturnType<typeof vaultOver>;
	readonly metadataCache: TaskMetadataCache;
	readonly fileManager: {
		processFrontMatter(file: TaskFile, edit: (frontmatter: TaskProps) => void): Promise<void>;
		renameFile(file: TaskFile, wanted: string): Promise<void>;
	};
	readonly workspace: { getLeaf(): { openFile(): Promise<void> } };
}

export interface TaskVault {
	readonly app: TaskApp;
	readonly files: TaskFile[];
	readonly counters: WalkCounters;
	readonly handlers: Set<FileHandler>;
	reset(): void;
}

interface AppAsk {
	readonly files: readonly TaskFile[];
	readonly folder: object;
	readonly counters: WalkCounters;
	readonly folderName: string;
	readonly metadataCache: TaskMetadataCache;
	readonly settleMs: number;
	readonly storageDelayMs: number;
}

interface CatalogueAdapter {
	exists(at: string): Promise<boolean>;
	read(): Promise<string>;
}

export const TASK_NEEDS: DeclaredNeeds = {
	title: { type: "text" },
	status: { type: "text" },
	order: { type: "number" },
	board: { type: "text" },
};
const STATUSES = ["todo", "doing", "done"];
const NOTE_TEXT = "---\ntitle: x\n---\nbody";

// TRADE-OFF: the metadata event is faked on a timer, because the real one is Obsidian's own debounce and no harness can hold it
// TRADE-OFF: a delay on the write, because a vault on iCloud or Dropbox hands the file back only once it has fetched it and a harness with instant storage proves nothing about that wait
export function fakeTaskVault(folderName: string, noteCount: number, settleMs = 10, storageDelayMs = 0): TaskVault {
	const counters: WalkCounters = { folderWalk: 0, toRecord: 0, frontmatterWrites: 0 };
	const files = Array.from({ length: noteCount }, (_, at) => taskFile(folderName, at));
	const folder = Object.assign(new TFolder(), { path: folderName, children: files });
	const handlers = new Set<FileHandler>();
	const metadataCache = metadataOver(counters, handlers);
	const app = appOver({ files, folder, counters, folderName, metadataCache, settleMs, storageDelayMs });
	return { app, files, counters, handlers, reset: () => resetCounters(counters) };
}

export const NO_PLUGIN: HostPlugin = {
	shapes: null,
	addChild: <T extends Component>(child: T): T => child,
	removeChild: <T extends Component>(child: T): T => child,
};

export function catalogueAdapter(catalogue: unknown, indexPath: string): CatalogueAdapter {
	return {
		exists: async (at) => at === indexPath && catalogue !== null,
		read: async () => JSON.stringify(catalogue),
	};
}

export function countingDisk(fsp: typeof FsPromises, nodePath: PlatformPath, counters: DiskCounters): SourceDisk {
	return {
		exists: (at) => {
			counters.exists += 1;
			return fsp.access(at).then(
				() => true,
				() => false,
			);
		},
		read: (at) => {
			counters.read += 1;
			return fsp.readFile(at, "utf8");
		},
		folders: async (at) => {
			counters.folders += 1;
			const held = await fsp.readdir(at, { withFileTypes: true });
			return held
				.filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
				.map((entry) => nodePath.join(at, entry.name));
		},
	};
}

function taskFile(folderName: string, at: number): TaskFile {
	return Object.assign(new TFile(), {
		path: `${folderName}/task-${at}.md`,
		basename: `task-${at}`,
		extension: "md",
		stat: { ctime: 1, mtime: 2, size: 400 },
		props: { title: `Task ${at}`, status: STATUSES[at % STATUSES.length], order: at, board: "Main" },
	});
}

function resetCounters(counters: WalkCounters): void {
	counters.folderWalk = 0;
	counters.toRecord = 0;
	counters.frontmatterWrites = 0;
}

function vaultOver(files: readonly TaskFile[], folder: object, counters: WalkCounters, folderName: string) {
	return {
		getAbstractFileByPath: (at: string): object | null => {
			if (at !== folderName) return files.find((file) => file.path === at) ?? null;
			counters.folderWalk += 1;
			return folder;
		},
		cachedRead: async (): Promise<string> => NOTE_TEXT,
		read: async (): Promise<string> => NOTE_TEXT,
		process: async (_file: TaskFile, edit: (text: string) => string): Promise<string> => edit(NOTE_TEXT),
		on: (): void => {},
		off: (): void => {},
	};
}

// TRADE-OFF: a snapshot that only refreshes on the event, because Obsidian reparses a note AFTER the write and a harness whose cache is instantly correct proves nothing about the lag
function metadataOver(counters: WalkCounters, handlers: Set<FileHandler>): TaskMetadataCache {
	const snapshots = new Map<string, Snapshot>();
	const reparse = (file: TaskFile) => snapshots.set(file.path, { frontmatter: { ...file.props }, embeds: [] });
	return {
		getFileCache: (file) => {
			counters.toRecord += 1;
			if (!snapshots.has(file.path)) reparse(file);
			return snapshots.get(file.path);
		},
		emit: (file) => {
			reparse(file);
			for (const handler of [...handlers]) handler(file);
		},
		forget: (file) => snapshots.delete(file.path),
		on: (_name, handler) => handlers.add(handler),
		off: (_name, handler) => handlers.delete(handler),
	};
}

function appOver({ files, folder, counters, folderName, metadataCache, settleMs, storageDelayMs }: AppAsk): TaskApp {
	return {
		vault: vaultOver(files, folder, counters, folderName),
		metadataCache,
		fileManager: {
			processFrontMatter: async (file, edit) => {
				counters.frontmatterWrites += 1;
				await new Promise<void>((done) => setTimeout(done, storageDelayMs));
				edit(file.props);
				setTimeout(() => metadataCache.emit(file), settleMs);
			},
			// TRADE-OFF: the new path carries no cache entry, the way Obsidian leaves it until the note is reparsed
			renameFile: async (file, wanted) => {
				metadataCache.forget(file);
				file.path = wanted;
				file.basename = wanted.slice(wanted.lastIndexOf("/") + 1).replace(/\.md$/, "");
				setTimeout(() => metadataCache.emit(file), settleMs);
			},
		},
		workspace: { getLeaf: () => ({ openFile: async () => {} }) },
	};
}
