import { TFile, TFolder, Notice } from "obsidian";
import { Dialog } from "./dialog.js";

function toRecord(app, file) {
	const cache = app.metadataCache.getFileCache(file);
	return {
		ref: { path: file.path },
		props: { ...(cache?.frontmatter ?? {}) },
		name: file.basename,
		meta: { created: file.stat.ctime, modified: file.stat.mtime },
	};
}

function valueOf(record, prop) {
	if (prop === "name" || prop === "title") return record.name;
	return record.props?.[prop];
}

const OPERATIONS = {
	eq: (left, right) => left === right,
	ne: (left, right) => left !== right,
	in: (left, right) => Array.isArray(right) && right.includes(left),
	lt: (left, right) => left < right,
	lte: (left, right) => left <= right,
	gt: (left, right) => left > right,
	gte: (left, right) => left >= right,
	contains: (left, right) => String(left ?? "").toLowerCase().includes(String(right).toLowerCase()),
	exists: (left, right) => (right === false ? left == null : left != null),
};

function matches(record, where) {
	if (!where || where.length === 0) return true;
	return where.every((clause) => {
		const operation = OPERATIONS[clause.op ?? "eq"];
		if (!operation) return true;
		return operation(valueOf(record, clause.prop), clause.value);
	});
}

function sortRecords(records, sort) {
	if (!sort || sort.length === 0) return records;
	const [{ prop, dir }] = sort;
	const direction = dir === "desc" ? -1 : 1;
	return [...records].sort((first, second) => {
		const a = valueOf(first, prop);
		const b = valueOf(second, prop);
		if (a === b) return 0;
		return a > b ? direction : -direction;
	});
}

function stringifyFrontmatter(props) {
	const lines = Object.entries(props).map(([key, value]) => {
		if (Array.isArray(value)) return `${key}: [${value.map((item) => JSON.stringify(item)).join(", ")}]`;
		if (typeof value === "string") return `${key}: ${JSON.stringify(value)}`;
		return `${key}: ${value}`;
	});
	return `---\n${lines.join("\n")}\n---\n`;
}

function slugify(text) {
	return String(text ?? "Untitled").replace(/[\\/:*?"<>|#^[\]]/g, "").trim() || "Untitled";
}

function settled(app, file) {
	return new Promise((resolve) => {
		const done = (changed) => {
			if (changed?.path !== file.path) return;
			app.metadataCache.off("changed", done);
			resolve();
		};
		app.metadataCache.on("changed", done);
		window.setTimeout(() => {
			app.metadataCache.off("changed", done);
			resolve();
		}, 800);
	});
}

function createSlot(app, binding) {
	const folderPath = binding?.path ?? "";
	const writable = Boolean(folderPath);

	const readFolder = () => {
		const folder = app.vault.getAbstractFileByPath(folderPath);
		if (!(folder instanceof TFolder)) return [];
		return folder.children
			.filter((child) => child instanceof TFile && child.extension === "md")
			.map((file) => toRecord(app, file));
	};

	const slot = {
		binding,
		canCreate: writable,
		canUpdate: writable,
		canRemove: writable,
		canSubscribe: true,
		canDescribe: true,

		async list(query = {}) {
			const rows = sortRecords(readFolder().filter((record) => matches(record, query.where)), query.sort);
			const limited = query.limit ? rows.slice(0, query.limit) : rows;
			return { rows: limited, total: rows.length };
		},

		async get(ref) {
			const file = app.vault.getAbstractFileByPath(ref.path);
			return file instanceof TFile ? toRecord(app, file) : null;
		},

		async describe() {
			const seen = new Map();
			for (const record of readFolder()) {
				for (const [key, value] of Object.entries(record.props)) {
					const known = seen.get(key) ?? { prop: key, type: typeof value, values: new Set() };
					if (typeof value === "string" && known.values.size < 24) known.values.add(value);
					seen.set(key, known);
				}
			}
			return [...seen.values()].map((entry) => ({ ...entry, values: [...entry.values] }));
		},

		subscribe(callback) {
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
		},
	};

	if (writable) {
		slot.create = async (draft) => {
			const title = draft.props?.title ?? draft.props?.name ?? "Untitled";
			const path = `${folderPath}/${slugify(title)}.md`;
			const body = draft.body ? `\n${draft.body}\n` : "\n";
			const file = await app.vault.create(path, stringifyFrontmatter(draft.props ?? {}) + body);
			return toRecord(app, file);
		};

		slot.update = async (ref, patch) => {
			const file = app.vault.getAbstractFileByPath(ref.path);
			if (!(file instanceof TFile)) return null;
			await app.fileManager.processFrontMatter(file, (frontmatter) => {
				Object.assign(frontmatter, patch.props ?? {});
			});
			await settled(app, file);
			return toRecord(app, file);
		};

		slot.remove = async (ref) => {
			const file = app.vault.getAbstractFileByPath(ref.path);
			if (file instanceof TFile) await app.fileManager.trashFile(file);
		};
	}

	return slot;
}

export function createHost(app, plugin) {
	return {
		can: {
			fullscreen: true,
			systemRun: !app.isMobile,
			subscribe: true,
			network: true,
		},

		slot(binding) {
			return createSlot(app, binding);
		},

		query: {
			async backlinks(path) {
				const resolved = app.metadataCache.resolvedLinks ?? {};
				return Object.entries(resolved)
					.filter(([, links]) => Object.keys(links).includes(path))
					.map(([source]) => ({ path: source }));
			},
		},

		ui: {
			Dialog,

			notify(message) {
				new Notice(message);
			},
			openNote(path) {
				const file = app.vault.getAbstractFileByPath(path);
				if (file instanceof TFile) app.workspace.getLeaf(false).openFile(file);
			},
		},

		app,
		plugin,
	};
}
