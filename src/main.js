import { Plugin, parseYaml, stringifyYaml, TFile, Notice, MarkdownRenderChild } from "obsidian";
import { h, render } from "preact";
import { WidgetSurface } from "./surface.js";
import { WidgetRegistry } from "./registry.js";
import { createHost } from "./host.js";
import { WIDGETS_DIR, COMPONENTS_DIR } from "./paths.js";
import { normalizeBoard, serializeBoard } from "./model.js";
import { findBlocks, replaceBlock } from "./block-writer.js";

const SCREEN_KEY = "widgetarium";

export default class WidgetariumPlugin extends Plugin {
	async onload() {
		this.editing = false;
		this.mounts = new Set();
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
		this.writing ??= Promise.resolve();
		this.writing = this.writing.then(() => this.flushWrites()).catch((failure) => console.error(failure));
	}

	async flushWrites() {
		const jobs = [...this.pending.values()];
		this.pending.clear();

		for (const job of jobs) {
			const file = this.app.vault.getAbstractFileByPath(job.sourcePath);
			if (!(file instanceof TFile)) continue;

			const text = await this.app.vault.read(file);
			const body = stringifyYaml(serializeBoard(job.board));
			const next = replaceBlock(text, job.blockIndex, body, (written) => {
				const parsed = parseYaml(written);
				return Boolean(parsed?.tiles) && parsed.tiles.length === job.board.tiles.length;
			});
			if (next === null) {
				console.error("[widgetarium] write cancelled: block not found or the result would be malformed");
				continue;
			}
			await this.app.vault.modify(file, next);
		}
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
		for (const mount of this.mounts) render(null, mount.element);
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
		for (const mount of this.mounts) mount.draw();
	}

	mount(element, board, save, screen, context) {
		const state = { board };
		const draw = () => {
			render(
				h(WidgetSurface, {
					board: state.board,
					registry: this.registry,
					host: this.host,
					editing: this.editing,
					onToggleEditing: () => this.toggleEditing(),
					screen,
					onChange: (next) => {
						state.layout = next;
						draw();
						save(next);
					},
				}),
				element,
			);
		};

		const mount = { element, draw };
		this.mounts.add(mount);
		draw();

		const child = new MarkdownRenderChild(element);
		child.onunload = () => {
			this.mounts.delete(mount);
			render(null, element);
		};
		context.addChild(child);
		return mount;
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

		const save = (next) => this.queueWrite(context.sourcePath, blockIndex, next);

		this.mount(element, board, save, this.isScreen(context.sourcePath), context);
	}

}

