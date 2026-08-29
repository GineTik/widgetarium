import { TFile, TFolder, Notice } from "obsidian";
import { Dialog } from "./dialog.js";
import { matches, valueOf } from "./engine/match.js";
import { readBody, replaceBody } from "./block-writer.js";

// TRADE-OFF: body absent on a listed record, present on a fetched one — twenty cards, no reads
function toRecord(app, file, body) {
	const cache = app.metadataCache.getFileCache(file);
	return {
		path: file.path,
		ref: { path: file.path },
		props: { ...(cache?.frontmatter ?? {}) },
		name: file.basename,
		meta: { created: file.stat.ctime, modified: file.stat.mtime },
		body,
	};
}

// CONTEXT: frontmatter is processFrontMatter's half; refuse rather than let a body write move it
async function writeBody(app, file, body) {
	const written = readBody(await app.vault.process(file, (text) => replaceBody(text, body) ?? text));
	if (written === String(body ?? "")) return written;
	console.error(`[widgetarium] body write refused: it would have moved the frontmatter of ${file.path}`);
	return undefined;
}

function sortRecords(records, sort) {
	if (!sort || sort.length === 0) return records;
	const [{ prop, dir }] = sort;
	const direction = dir === "desc" ? -1 : 1;
	return [...records].sort((first, second) => {
		const a = valueOf(first, prop);
		const b = valueOf(second, prop);
		// A record with nothing to sort by goes LAST in either direction. Comparing against
		// undefined returns false both ways, so the order it landed in was whatever the
		// sort happened to do — a note created without the property moved around on its own.
		const aMissing = a === undefined || a === null || a === "";
		const bMissing = b === undefined || b === null || b === "";
		if (aMissing || bMissing) return aMissing && bMissing ? 0 : aMissing ? 1 : -1;
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

		// TRADE-OFF: one note, so the read belongs here and never in list()
		async get(ref) {
			const file = app.vault.getAbstractFileByPath(ref.path);
			if (!(file instanceof TFile)) return null;
			return toRecord(app, file, readBody(await app.vault.cachedRead(file)));
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
			// CONTEXT: same rule as update — the record reports the body that landed
			return toRecord(app, file, draft.body === undefined ? undefined : readBody(await app.vault.read(file)));
		};

		slot.update = async (ref, patch) => {
			const file = app.vault.getAbstractFileByPath(ref.path);
			if (!(file instanceof TFile)) return null;
			// CONTEXT: processFrontMatter restringifies the YAML — skip it for a body-only patch
			if (patch.props) {
				await app.fileManager.processFrontMatter(file, (frontmatter) => {
					Object.assign(frontmatter, patch.props);
				});
			}
			// CONTEXT: what LANDED, never what was asked — a refused write must not be reported
			const body = patch.body === undefined ? undefined : await writeBody(app, file, patch.body);
			await settled(app, file);
			return toRecord(app, file, body);
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
		// which environment the widget is running in. The same widget runs on the web or on
		// the desktop against a different host; this is the only thing it may branch on.
		platform: "obsidian",

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

