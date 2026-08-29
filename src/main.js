import { Plugin, parseYaml, stringifyYaml, TFile, Notice, MarkdownRenderChild } from "obsidian";
import { h, render } from "preact";
import { WidgetSurface } from "./surface.js";
import { WidgetRegistry } from "./registry.js";
import { createHost } from "./host.js";
import { WIDGETS_DIR, COMPONENTS_DIR } from "./paths.js";
import { normalizeBoard, serializeBoard } from "./model.js";
import { shieldFromEditor } from "./editor-shield.js";
import { mountKeyFor } from "./mount-key.js";
import { trace } from "./trace.js";
import { findBlocks, replaceBlock } from "./block-writer.js";


// a run of edits settles into one write; longer and an edit could be lost to a crash
const WRITE_SETTLE_MS = 400;
const SCREEN_KEY = "widgetarium";

export default class WidgetariumPlugin extends Plugin {
	async onload() {
		this.editing = false;
		this.mounts = new Map();
		this.registry = new WidgetRegistry(this.app);
		this.host = createHost(this.app, this);

		await this.ensureFolders();
		await this.registry.load();

		this.registerMarkdownCodeBlockProcessor("widgetarium", (source, element, context) =>
			this.renderBlock(source, element, context),
		);

		// .widgetarium is a dot folder, so the vault never emits events for it — poll instead
		this.signature = await this.widgetSignature();
		this.registerInterval(window.setInterval(() => this.pollWidgets(), 500));

		this.addRibbonIcon("layout-grid", "Widgetarium: edit mode", () => this.toggleEditing());

		this.addCommand({
			id: "toggle-edit",
			name: "Toggle edit mode",
			callback: () => this.toggleEditing(),
		});

		this.addCommand({
			id: "reload-plugin",
			name: "Reload plugin",
			callback: async () => {
				const plugins = this.app.plugins;
				await plugins.disablePlugin(this.manifest.id);
				await plugins.enablePlugin(this.manifest.id);
				new Notice("Widgetarium: plugin reloaded");
			},
		});

		this.addCommand({
			id: "reload-widgets",
			name: "Reload widgets",
			callback: async () => {
				await this.registry.load();
				this.refresh();
				new Notice(`Widgetarium: ${this.registry.list().length} widgets`);
			},
		});
	}

	queueWrite(sourcePath, blockIndex, board) {
		if (blockIndex < 0) return;
		this.pending ??= new Map();
		this.pending.set(`${sourcePath}#${blockIndex}`, { sourcePath, blockIndex, board });

		// Held back briefly on purpose. Every write makes Obsidian rebuild the block, and a
		// rebuild throws the element away — so writing on each commit meant a rebuild in the
		// middle of a run of edits. A burst now leaves one write behind it.
		clearTimeout(this.writeTimer);
		this.writeTimer = setTimeout(() => {
			this.writing ??= Promise.resolve();
			this.writing = this.writing.then(() => this.flushWrites()).catch((failure) => console.error(failure));
		}, WRITE_SETTLE_MS);
	}

	async flushWrites() {
		const jobs = [...this.pending.entries()];
		this.pending.clear();
		// A re-render arriving while these are on their way must not adopt the older source:
		// Obsidian re-runs the block processor on our own write, and the text it hands back
		// can predate it.
		this.inFlight ??= new Set();
		for (const [key] of jobs) this.inFlight.add(key);

		for (const [key, job] of jobs) {
			try {
				await this.writeBlock(job);
			} finally {
				this.inFlight.delete(key);
			}
		}
	}

	async writeBlock(job) {
		trace("write", {
			block: `${job.sourcePath}#${job.blockIndex}`,
			layouts: Object.keys(job.board.layouts).join(","),
		});
		const file = this.app.vault.getAbstractFileByPath(job.sourcePath);
		if (!(file instanceof TFile)) return;

		const text = await this.app.vault.read(file);
		const body = stringifyYaml(serializeBoard(job.board));
		const next = replaceBlock(text, job.blockIndex, body, (written) => {
			const parsed = parseYaml(written);
			return Boolean(parsed?.tiles) && parsed.tiles.length === job.board.tiles.length;
		});
		if (next === null) {
			console.error("[widgetarium] write cancelled: block not found or the result would be malformed");
			return;
		}
		await this.app.vault.modify(file, next);
	}

	async widgetSignature() {
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(WIDGETS_DIR))) return "";

		const parts = [];
		for (const scope of (await adapter.list(WIDGETS_DIR)).folders) {
			for (const folder of (await adapter.list(scope)).folders) {
				for (const file of (await adapter.list(folder)).files) {
					const stat = await adapter.stat(file);
					parts.push(`${file}:${stat?.mtime ?? 0}:${stat?.size ?? 0}`);
				}
			}
		}
		return parts.join("|");
	}

	async pollWidgets() {
		if (this.isPolling || this.mounts.size === 0) return;
		this.isPolling = true;
		try {
			const signature = await this.widgetSignature();
			if (signature !== this.signature) {
				this.signature = signature;
				await this.registry.load();
				this.refresh();
			}
		} finally {
			this.isPolling = false;
		}
	}

	onunload() {
		// the key is the block, so the element lives on the record — iterating keys here
		// handed render() a string and left every surface mounted
		clearTimeout(this.writeTimer);
		// the widget stylesheets live in document.head and outlive the plugin unless dropped
		this.registry?.dropStyles?.();
		// a held-back write must not die with the plugin
		if (this.pending?.size) this.flushWrites().catch((failure) => console.error(failure));
		for (const mount of this.mounts.values()) render(null, mount.element);
		this.mounts.clear();
	}

	async ensureFolders() {
		const adapter = this.app.vault.adapter;
		for (const folder of [WIDGETS_DIR, COMPONENTS_DIR]) {
			if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
		}
	}

	toggleEditing() {
		this.editing = !this.editing;
		this.refresh();
		new Notice(this.editing ? "Widgetarium: editing on" : "Widgetarium: editing off");
	}

	refresh() {
		for (const mount of this.mounts.values()) mount.draw();
	}

	// Keyed by BLOCK, never by element. Obsidian throws the element away and builds a new
	// one after every write of ours, so a mount keyed by element was a brand-new mount each
	// time: the surface remounted, its width and its drag state reset, and the board blinked
	// through an unmeasured frame. Keyed by block, the same record simply moves to the new
	// element and carries the measured width with it, so nothing blinks.
	mount(element, board, save, screen, context, blockKey) {
		shieldFromEditor(element);

		const key = blockKey ?? element;
		// The first render of a note has no section info, so the board starts life under its
		// positional key and gains its real one as soon as the editor can say where it is.
		// Carrying the mount across is the difference between renaming it and rebuilding it.
		const assumed = `${context.sourcePath}#0`;
		if (!this.mounts.has(key) && key !== assumed && this.mounts.has(assumed)) {
			this.mounts.set(key, this.mounts.get(assumed));
			this.mounts.delete(assumed);
		}
		const existing = this.mounts.get(key);

		if (existing) {
			trace("re-mount", {
				key: String(key),
				blockKey,
				sameElement: existing.element === element,
				pendingWrite: this.hasPendingWrite(blockKey),
				keptWidth: existing.width,
			});
			// A write of ours may still be in flight, which means the source we were just
			// handed predates it. Adopting it would undo the edit that caused this render.
			if (!this.hasPendingWrite(blockKey)) existing.state.board = board;
			if (existing.element !== element) {
				// Obsidian hands us a NEW element on every re-render of the note, and our own
				// write causes one. Unmounting and re-rendering into it threw away preact's
				// tree: the whole board was built from scratch, which is the white flash and
				// the widgets visibly scattering and re-assembling. We own the node inside,
				// so we move it across instead — the tree, its state and its DOM survive.
				element.appendChild(existing.node);
				existing.element = element;
			}
			existing.save = save;
			existing.screen = screen;
			existing.draw();
			this.watch(existing, key, context);
			return existing;
		}

		// our own node inside Obsidian's element: the element is theirs and is replaced, the
		// node is ours and is not
		const node = element.ownerDocument.createElement("div");
		node.className = "wg-mount";
		element.appendChild(node);

		const mount = { element, node, state: { board }, save, screen, width: 0 };
		mount.draw = () => {
			render(
				h(WidgetSurface, {
					board: mount.state.board,
					registry: this.registry,
					host: this.host,
					editing: this.editing,
					onToggleEditing: () => this.toggleEditing(),
					screen: mount.screen,
					// handed back so a rebuilt element starts at the width the old one had
					initialWidth: mount.width,
					onWidth: (value) => {
						mount.width = value;
					},
					onChange: (next) => {
						mount.state.board = next;
						mount.draw();
						mount.save(next);
					},
				}),
				mount.node,
			);
		};

		this.mounts.set(key, mount);
		mount.draw();
		this.watch(mount, key, context);
		return mount;
	}

	// one watcher per element, not per call: the processor runs again on the SAME element
	// often, and a watcher each time piled them up for the life of the note
	watch(mount, key, context) {
		if (mount.watched === mount.element) return;
		mount.watched = mount.element;
		const element = mount.element;
		const child = new MarkdownRenderChild(element);
		child.onunload = () => {
			// THE ONE THAT MATTERED. Obsidian unloads the old child BEFORE it re-renders the
			// block, so at this moment the mount still points at the element being unloaded —
			// the guard passed, the tree was destroyed, and the board was rebuilt from nothing
			// on every single write. That is the flicker and the shaking, and no amount of
			// keying the mount could survive it.
			//
			// An unload alone does not mean the board is gone; it means THIS element is. Decide
			// one tick later, when the re-render has either happened or not: our own node is
			// still in the document if the block came back, and orphaned if the view closed.
			window.setTimeout(() => {
				const current = this.mounts.get(key);
				if (!current || current.node.isConnected) return;
				this.mounts.delete(key);
				render(null, current.node);
			}, 0);
		};
		context.addChild(child);
	}

	hasPendingWrite(blockKey) {
		if (!blockKey) return false;
		return Boolean(this.pending?.has(blockKey)) || Boolean(this.inFlight?.has(blockKey));
	}

	isScreen(sourcePath) {
		const file = this.app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) return false;
		return this.app.metadataCache.getFileCache(file)?.frontmatter?.[SCREEN_KEY] === "screen";
	}

	renderBlock(source, element, context) {
		let board;
		try {
			board = normalizeBoard(parseYaml(source) ?? []);
		} catch (failure) {
			element.createEl("pre", { text: `Widgetarium: cannot read YAML — ${failure}` });
			return;
		}

		const info = context.getSectionInfo(element);
		const blockIndex = info
			? findBlocks(info.text.split("\n")).findIndex((block) => block.start === info.lineStart)
			: -1;

		// getSectionInfo returns null while the editor is mid-render — which is exactly when
		// OUR OWN write lands. The key then fell back to the element, and the element is new
		// every time, so every write built a whole new board: the flicker, the lost editing
		// mode, and a collapsed panel springing back open because the fresh mount read the
		// file from before the write.
		//
		// A note almost always holds one board. When the position is unreadable we reuse the
		// only mount this note has; with several boards and no position we cannot tell them
		// apart, and a fresh mount is the honest answer.
		const blockKey = mountKeyFor(this.mounts.keys(), context.sourcePath, blockIndex);
		const writeIndex = blockIndex >= 0 ? blockIndex : this.mounts.get(blockKey)?.blockIndex;

		const save = (next) => {
			if (writeIndex === undefined) return;
			this.queueWrite(context.sourcePath, writeIndex, next);
		};

		const mounted = this.mount(element, board, save, this.isScreen(context.sourcePath), context, blockKey);
		if (blockIndex >= 0) mounted.blockIndex = blockIndex;
	}

}

