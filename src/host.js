import { TFile, TFolder, Notice, MarkdownRenderer, MarkdownRenderChild, Platform } from "obsidian";
import { Dialog } from "./dialog.js";
import { fieldsOf } from "./gateway/fields.js";
import { isMatch, valueOf } from "./gateway/match.js";
import { readBody, replaceBody } from "./block-writer.js";
import { typeOf } from "./engine/record-type.js";
import { readLink } from "./engine/link.js";
import { hostTypeOf } from "./engine/host-type.js";
import { createConsole } from "./engine/host-console.js";
import { readTarget, refusedRead } from "./engine/read-file.js";
import { duplicateIds, mintId, mustRemint, readId, reportDuplicates, withId } from "./record-id.js";

// TRADE-OFF: body absent on a listed record, present on a fetched one — twenty cards, no reads
function toRecord(app, file, body) {
	const cache = app.metadataCache.getFileCache(file);
	return {
		path: file.path,
		ref: { path: file.path },
		props: { ...(cache?.frontmatter ?? {}) },
		// CONTEXT: the storage key never leaves this line — a widget sees record.id and nothing else
		id: readId(cache?.frontmatter),
		name: file.basename,
		type: typeOf(file.path),
		meta: { created: file.stat.ctime, modified: file.stat.mtime },
		// HOW MANY FILES THIS NOTE CARRIES, without reading a single note. Obsidian has already
		// parsed every note's embeds into its cache, so counting them here costs nothing — reading
		// twenty bodies to count links in them would cost twenty reads to draw one board.
		attachments: (cache?.embeds ?? []).length,
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

// CONTEXT: one spelling of "which file is this link", shared by the navigator and the reader
function findByLink(app, from, link) {
	const parsed = readLink(link);
	if (!parsed) return null;
	if (!parsed.rooted) return app.metadataCache.getFirstLinkpathDest(parsed.path, from) ?? null;
	const direct = app.vault.getAbstractFileByPath(parsed.path);
	return direct ?? app.vault.getAbstractFileByPath(`${parsed.path}.md`) ?? null;
}

// NAVIGATION IS NOT DATA. The gateway answers what exists; this one takes a person somewhere,
// and it is the only thing in a widget's hands that can.
function createNavigator(app, from) {
	const find = (link) => findByLink(app, from, link);

	return {
		canNavigate: true,
		resolve: (link) => find(link)?.path ?? null,
		navigate: (link) => {
			const file = find(link);
			if (!(file instanceof TFile)) return false;
			app.workspace.getLeaf(false).openFile(file);
			return true;
		},
	};
}

// CONTEXT: a widget reading a file it names is its own entity, like the navigator beside it
function createReader(app, from) {
	return {
		canRead: true,
		// TRADE-OFF: the cap is asked before the read — a refusal after loading 200 MB is not one
		async read(link, options = {}) {
			const target = readTarget(link);
			if (!target.ok) return refusedRead(target.failure);

			const found = findByLink(app, from, target.link);
			if (!found) return refusedRead(`${target.link} is not in this vault`);
			if (!(found instanceof TFile)) return refusedRead(`${found.path} is a folder, not a file`, found.path);

			const bytes = found.stat?.size ?? 0;
			const cap = Number(options.maxBytes ?? 0);
			if (cap > 0 && bytes > cap) {
				return refusedRead(`${found.path} is ${Math.round(bytes / 1024)} KB, over the ${Math.round(cap / 1024)} KB limit`, found.path, bytes);
			}
			return { ok: true, text: await app.vault.cachedRead(found), path: found.path, bytes, failure: null };
		},
	};
}

// THE SOLO GATEWAY: one record, no list and no filters, because there is nothing to choose
// between. What "here" means is set by whoever mounts the widget — the note under a board,
// the paragraph under an inline widget.
export function noteHere(app, notePath) {
	const fileAt = () => {
		const found = app.vault.getAbstractFileByPath(notePath);
		return found instanceof TFile ? found : null;
	};

	return {
		of: "entry",
		// TRADE-OFF: absent here, present after get() — mirroring a listed record against a
		// fetched one, because reading every note body to draw a board is the cost this avoids
		content: null,
		canUpdate: true,
		async get() {
			const file = fileAt();
			if (!file) return null;
			const body = readBody(await app.vault.read(file));
			return { ...toRecord(app, file, body), content: body };
		},
		async update(content) {
			const file = fileAt();
			if (!file) return false;
			return (await writeBody(app, file, content)) !== undefined;
		},
	};
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
		// CONTEXT: one level deep is all this emits — the namespace around an id
		if (value && typeof value === "object") {
			return [`${key}:`, ...Object.entries(value).map(([held, inner]) => `  ${held}: ${JSON.stringify(inner)}`)].join("\n");
		}
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

	// CONTEXT: a subfolder groups a collection, it does not divide it — Notes/2025 is still Notes
	const readFolder = () => {
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
	};

	// CONTEXT: said once per id — list() re-runs on every vault event
	const reported = new Set();

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
			// CONTEXT: picking one of two records claiming an id in silence is forbidden
			const duplicates = duplicateIds(held);
			reportDuplicates(
				duplicates.filter((entry) => !reported.has(entry.id)),
				(said) => {
					console.warn(said);
				},
			);
			for (const entry of duplicates) reported.add(entry.id);
			const rows = sortRecords(held.filter((record) => isMatch(record, query.where)), query.sort);
			const limited = query.limit ? rows.slice(0, query.limit) : rows;
			return { rows: limited, total: rows.length, duplicates };
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
			const title = draft.name ?? draft.props?.title ?? draft.props?.name ?? "Untitled";
			const path = `${folderPath}/${slugify(title)}.md`;
			// CONTEXT: vault.create refuses a path whose folder is not there, and the first record makes it
			if (!(app.vault.getAbstractFileByPath(folderPath) instanceof TFolder)) await app.vault.createFolder(folderPath);
			const body = draft.body ? `\n${draft.body}\n` : "\n";
			// CONTEXT: creating a record IS the explicit action an id is minted on
			const file = await app.vault.create(path, stringifyFrontmatter(withId(draft.props ?? {}, mintId())) + body);
			// CONTEXT: same rule as update — the record reports the body that landed
			return toRecord(app, file, draft.body === undefined ? undefined : readBody(await app.vault.read(file)));
		};

		const renamedTo = async (file, name) => {
			const wanted = `${folderPath}/${slugify(name)}.md`;
			if (wanted === file.path) return file;
			await app.fileManager.renameFile(file, wanted);
			return app.vault.getAbstractFileByPath(wanted) ?? file;
		};

		slot.update = async (ref, patch) => {
			const found = app.vault.getAbstractFileByPath(ref.path);
			if (!(found instanceof TFile)) return null;
			const file = patch.name === undefined ? found : await renamedTo(found, patch.name);
			// CONTEXT: processFrontMatter restringifies the YAML — skip it for a body-only patch
			// CONTEXT: a duplicate's loser is re-minted by the first write that reaches it, never on read
			const remint = mustRemint(duplicateIds(readFolder()), file.path);
			if (patch.props || remint) {
				await app.fileManager.processFrontMatter(file, (frontmatter) => {
					Object.assign(frontmatter, patch.props ?? {});
					if (remint) Object.assign(frontmatter, withId(frontmatter, mintId()));
				});
			}
			// CONTEXT: what LANDED, never what was asked — a refused write must not be reported
			const body = patch.body === undefined ? undefined : await writeBody(app, file, patch.body);
			if (patch.props || remint || patch.body !== undefined) await settled(app, file);
			return toRecord(app, file, body);
		};

		// CONTEXT: the repair is a press — detection only reports
		slot.repairIds = async () => {
			const duplicates = duplicateIds(readFolder());
			let minted = 0;
			for (const entry of duplicates) {
				for (const path of entry.remints) {
					const file = app.vault.getAbstractFileByPath(path);
					if (!(file instanceof TFile)) continue;
					await app.fileManager.processFrontMatter(file, (frontmatter) => Object.assign(frontmatter, withId(frontmatter, mintId())));
					minted += 1;
				}
			}
			return minted;
		};

		slot.remove = async (ref) => {
			const file = app.vault.getAbstractFileByPath(ref.path);
			if (file instanceof TFile) await app.fileManager.trashFile(file);
		};
	}

	return slot;
}

// CONTEXT: wikilinks resolve against the note they are written in, not the vault root
export function createHost(app, plugin, notePath = "") {
	return {
		shapes: plugin?.shapes ?? null,

		// which environment the widget is running in. The same widget runs on the web or on
		// the desktop against a different host; this is the only thing it may branch on.
		platform: "obsidian",
		// CONTEXT: the family above, the BUILD here — what the host can actually reach differs
		// between a desktop app, a phone and a browser tab
		type: hostTypeOf(Platform),

		can: {
			fullscreen: true,
			subscribe: true,
			network: true,
			renderMarkdown: true,
		},

		// CONTEXT: `systemRun` was declared here and read by nobody — console.can.run owns it now
		console: createConsole(hostTypeOf(Platform), window.require?.bind(window), app.vault.adapter?.basePath),

		slot(binding) {
			return createSlot(app, binding);
		},

		file(path) {
			return noteHere(app, path);
		},

		// CONTEXT: one note's events, for a value gateway over a single file
		watchFile(path, callback) {
			const handler = (file) => {
				if (file?.path === path) callback();
			};
			app.vault.on("modify", handler);
			app.vault.on("delete", handler);
			app.vault.on("rename", handler);
			app.metadataCache.on("changed", handler);
			return () => {
				app.vault.off("modify", handler);
				app.vault.off("delete", handler);
				app.vault.off("rename", handler);
				app.metadataCache.off("changed", handler);
			};
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
			// TRADE-OFF: read mode with post-processors, not an editable live preview
			// CONTEXT: the child unloads the embeds and handlers Obsidian registers inside
			renderMarkdown(element, markdown, sourcePath = notePath) {
				element.textContent = "";
				const child = new MarkdownRenderChild(element);
				plugin.addChild(child);
				// A widget re-renders faster than a render settles, so the stop it returns must
				// survive being called twice and being called early: a second removeChild would
				// unload an unloaded child, and a render landing after the stop would paint into
				// an element its owner has already given up.
				let stopped = false;
				MarkdownRenderer.render(app, String(markdown ?? ""), element, sourcePath, child)
					.then(() => {
						if (stopped) element.textContent = "";
					})
					.catch((failure) => console.error("[widgetarium] markdown render failed", failure));
				return () => {
					if (stopped) return;
					stopped = true;
					plugin.removeChild(child);
				};
			},
		},

		navigator: createNavigator(app, notePath),
		reader: createReader(app, notePath),
		here: notePath ? noteHere(app, notePath) : null,

		app,
		plugin,
	};
}

// The host is built once per plugin; WHICH NOTE a board sits in is known per mount. Binding
// it here means a widget calls renderMarkdown(element, markdown) and its wikilinks resolve
// from its own note — a widget has no way to learn the path, so it must not have to pass one.
export function bindNote(host, notePath) {
	if (!notePath) return host;
	return {
		...host,
		here: noteHere(host.app, notePath),
		navigator: createNavigator(host.app, notePath),
		reader: createReader(host.app, notePath),
		ui: {
			...host.ui,
			renderMarkdown: (element, markdown, sourcePath = notePath) => host.ui.renderMarkdown(element, markdown, sourcePath),
		},
	};
}
