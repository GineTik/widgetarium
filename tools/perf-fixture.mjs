import { buildMirror } from "./mirror.mjs";

globalThis.window = { setTimeout, clearTimeout, queueMicrotask };
buildMirror();

const { TFile, TFolder } = await import("./.mjs-cache/obsidian.mjs");

export const TASK_NEEDS = {
	title: { type: "text" },
	status: { type: "text" },
	order: { type: "number" },
	board: { type: "text" },
};
const STATUSES = ["todo", "doing", "done"];
const NOTE_TEXT = "---\ntitle: x\n---\nbody";

function taskFile(folderName, at) {
	const file = Object.assign(new TFile(), {
		path: `${folderName}/task-${at}.md`,
		basename: `task-${at}`,
		extension: "md",
		stat: { ctime: 1, mtime: 2, size: 400 },
	});
	file.props = { title: `Task ${at}`, status: STATUSES[at % STATUSES.length], order: at, board: "Main" };
	return file;
}

function vaultOver(files, folder, counters, folderName) {
	return {
		getAbstractFileByPath: (at) => {
			if (at !== folderName) return files.find((file) => file.path === at) ?? null;
			counters.folderWalk += 1;
			return folder;
		},
		cachedRead: async () => NOTE_TEXT,
		read: async () => NOTE_TEXT,
		process: async (file, edit) => edit(NOTE_TEXT),
		on: () => {},
		off: () => {},
	};
}

// TRADE-OFF: a snapshot that only refreshes on the event, because Obsidian reparses a note AFTER the write and a harness whose cache is instantly correct proves nothing about the lag
function metadataOver(counters, handlers) {
	const snapshots = new Map();
	const reparse = (file) => snapshots.set(file.path, { frontmatter: { ...file.props }, embeds: [] });
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
		on: (name, handler) => handlers.add(handler),
		off: (name, handler) => handlers.delete(handler),
	};
}

function appOver({ files, folder, counters, folderName, metadataCache, settleMs, storageDelayMs }) {
	return {
		vault: vaultOver(files, folder, counters, folderName),
		metadataCache,
		fileManager: {
			processFrontMatter: async (file, edit) => {
				counters.frontmatterWrites += 1;
				await new Promise((done) => setTimeout(done, storageDelayMs));
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

// TRADE-OFF: the metadata event is faked on a timer, because the real one is Obsidian's own debounce and no harness can hold it
// TRADE-OFF: a delay on the write, because a vault on iCloud or Dropbox hands the file back only once it has fetched it and a harness with instant storage proves nothing about that wait
export function fakeTaskVault(folderName, noteCount, settleMs = 10, storageDelayMs = 0) {
	const counters = { folderWalk: 0, toRecord: 0, frontmatterWrites: 0 };
	const files = Array.from({ length: noteCount }, (_, at) => taskFile(folderName, at));
	const folder = Object.assign(new TFolder(), { path: folderName, children: files });
	const handlers = new Set();
	const metadataCache = metadataOver(counters, handlers);
	const app = appOver({ files, folder, counters, folderName, metadataCache, settleMs, storageDelayMs });
	return { app, files, counters, handlers, reset: () => Object.keys(counters).forEach((key) => (counters[key] = 0)) };
}

export const NO_PLUGIN = { shapes: null, addChild: () => {}, removeChild: () => {} };

export function catalogueAdapter(catalogue, indexPath) {
	return {
		exists: async (at) => at === indexPath && catalogue !== null,
		read: async () => JSON.stringify(catalogue),
	};
}

export function countingDisk(fsp, nodePath, counters) {
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
