import { Plugin, parseYaml, stringifyYaml, TFile, TFolder, Notice, MarkdownRenderChild, Platform, requestUrl } from "obsidian";
import { createHeaderActions } from "./header-actions.js";

const EDIT_TITLE = { on: "Leave Widgetarium edit mode", off: "Edit the Widgetarium board" };
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { WidgetRegistry, buildWidget, declaredName } from "@widgetarium/core/registry.js";
import { sourceFileIn } from "@widgetarium/core/engine/widget-build.js";
import { scopeOf } from "@widgetarium/core/engine/widget-source.js";
import { REACT_SURFACE_SOURCE } from "widgetarium:surface";
import { createHost, bindNote } from "./host.js";
import { WIDGETS_DIR, COMPONENTS_DIR } from "@widgetarium/core/paths.js";
import { normalizeBoard, placedIds, serializeBoard } from "@widgetarium/core/model.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { mountKeyFor } from "@widgetarium/core/mount-key.js";
import { trace, traceSub, setTracing, tracing, measure, spentSoFar, forgetSpent } from "@widgetarium/core/trace.js";
import { findBlocks, replaceBlock, writeInEditor } from "@widgetarium/core/block-writer.js";
import { createShapeStore, shapesOf } from "@widgetarium/kit/shapes";
import { openCatalogue } from "@widgetarium/core/catalogue-dialog.js";
import { createInstaller } from "@widgetarium/core/installer.js";
import { openSubstitutions } from "./substitution-dialog.js";
import { normalizeRules, activeRules, ruleBlock } from "./substitution.js";
import { substituteIn } from "./inline-render.js";
import { blockRefusal } from "@widgetarium/core/version.js";
import { createBoardNote, insertBoardAtCursor, isScreenNote } from "./board-note.js";
import { TEMPLATES, templateBoard, templateWidgets, widgetsNamedBy } from "@widgetarium/core/templates.js";
import { createWantedWidgets } from "@widgetarium/core/engine/widgets-wanted.js";
import { createAssistant } from "./ai/assistant.js";
import { AI_VIEW_TYPE, AssistantView } from "./ai/view.js";
import { WidgetariumSettingTab } from "./ai/settings-tab.js";


// a run of edits settles into one write; longer and an edit could be lost to a crash
const WRITE_SETTLE_MS = 400;
const WIDGET_POLL_MS = 1000;
const BOARD_REFUSED = "Widgetarium: the board was not created — {reason}";
const OFFERS_REFUSED = "Widgetarium: the widget catalogue could not be read — {reason}";
const BOARD_NOT_INSERTED = "Widgetarium: this note has a code fence that was never closed, so there is nowhere safe to put a board. Close the fence and try again.";
const CARD_NOT_COMPARED = "[widgetarium] the card of {widget} could not be compared with its code, so the install goes on without that check:";

function declaredManifestOf(held) {
	const name = sourceFileIn(held.files);
	const scope = scopeOf(held.record.id);
	try {
		const component = buildWidget({
			manifest: held.record,
			code: held.files[name],
			path: `${held.record.id}/${name}`,
			lib: held.scope?.["lib.js"],
			libPath: `${scope}/lib.js`,
			scope,
		});
		return component.manifest ?? null;
	} catch (failure) {
		console.warn(CARD_NOT_COMPARED.replace("{widget}", held.record.id), failure);
		return null;
	}
}

const INSTALLED_AT = "Widgetarium: installed {widget} at {commit}";
const INSTALLED_BESIDE = "Widgetarium: {widget} at {commit} changed what its tiles hold, so it was installed beside the version they use";
const INSTALL_AT_REFUSED = "Widgetarium: {widget} was not installed — {why}";
const WIDGETS_FETCHED = "Widgetarium: fetched {widgets}";

// CONTEXT: an offer that cannot be drawn is a name; one that can is the widget itself
export function drawable(entry) {
	if (!entry?.code) return entry;
	try {
		return { ...entry, component: buildWidget(entry) };
	} catch (error) {
		return { ...entry, error };
	}
}

// CONTEXT: a folder source lives on the machine, and only a desktop build can reach one
function diskDoor() {
	// CONTEXT: a phone has no such door, and neither does a harness that loads this as an ES module
	if (!Platform.isDesktopApp || typeof require !== "function") return null;
	const fs = require("node:fs/promises");
	const path = require("node:path");
	return {
		exists: (at) => fs.access(at).then(() => true, () => false),
		read: (at) => fs.readFile(at, "utf8"),
		folders: async (at) => {
			const held = await fs.readdir(at, { withFileTypes: true });
			return held.filter((entry) => entry.isDirectory()).map((entry) => path.join(at, entry.name));
		},
	};
}

export default class WidgetariumPlugin extends Plugin {
	// CONTEXT: the console switch — app.plugins.plugins.widgetarium.logging = true
	get logging() {
		return tracing();
	}

	set logging(on) {
		setTracing(on);
	}

	async onload() {
		const startedAt = performance.now();
		this.editing = false;
		this.mounts = new Map();
		this.header = createHeaderActions({
			app: this.app,
			mounts: () => this.mounts.values(),
			editAction: () => ({
				key: "edit",
				icon: "pencil",
				title: this.editing ? EDIT_TITLE.on : EDIT_TITLE.off,
				isOn: this.editing,
				press: () => this.toggleEditing(),
			}),
		});
		this.registerEvent(this.app.workspace.on("layout-change", () => this.header.sync()));
		this.registry = new WidgetRegistry(this.app, REACT_SURFACE_SOURCE);
		this.shapeAnswers = {};
		this.shapes = createShapeStore({
			read: () => this.shapeAnswers,
			write: (next) => {
				this.shapeAnswers = next;
				void this.saveShapes(next);
			},
		});
		this.host = createHost(this.app, this);
		if (typeof this.app.vault?.on === "function") {
			this.registerEvent(
				this.app.vault.on("rename", (file, was) => {
					if (!file?.children) return;
					this.shapes.follow(was, file.path);
				}),
			);
		}

		this.rules = [];

		// CONTEXT: Obsidian never reprocesses a note rendered before registration
		this.registerMarkdownCodeBlockProcessor("widgetarium", (source, element, context) =>
			this.renderBlock(source, element, context),
		);

		this.registerMarkdownPostProcessor((element, context) =>
			measure("substitutions in a rendered section", () =>
			substituteIn({
				element,
				context,
				rules: this.rules,
				registry: this.registry,
				app: this.app,
				// CONTEXT: bound to the note, so a link a widget reads resolves the way one written there does
				host: bindNote(this.host, context.sourcePath),
			})),
		);
		traceSub("post-processor registered", { rules: this.rules.length });

		await measure("onload · ensureFolders", () => this.ensureFolders());
		await measure("onload · registry.load", () => this.registry.load());
		const stored = await measure("onload · loadData", () => this.loadData());
		this.shapeAnswers = shapesOf(stored?.shapes);
		this.rules = normalizeRules(stored?.substitutions);
		traceSub("rules loaded", () => ({
			rules: this.rules.length,
			live: activeRules(this.rules).length,
			blocked: this.rules.filter(ruleBlock).map((rule) => `${rule.id} (${ruleBlock(rule)})`),
			widgets: this.rules.map((rule) => rule.widget),
		}));
		this.installer = createInstaller({
			adapter: this.app.vault.adapter,
			fetchJson: (url) => requestUrl({ url }).then((answer) => answer.json),
			fetchText: (url) => requestUrl({ url }).then((answer) => answer.text),
			disk: diskDoor(),
			readAdded: () => this.addedRegistries(),
			declaredIn: declaredManifestOf,
		});
		this.wanted = createWantedWidgets({
			isHeld: (id) => Boolean(this.registry.get(id)),
			installOne: async (id) => this.installer.installAt(id, await this.offers()),
			reread: () => this.rereadWidgets(),
			onInstalled: (ids) => new Notice(WIDGETS_FETCHED.replace("{widgets}", ids.join(", "))),
		});
		measure("onload · rerenderNotes", () => this.rerenderNotes());
		if (await measure("onload · isAuthoringWidgetsHere", () => this.isAuthoringWidgetsHere())) await measure("onload · widgetSignature", () => this.watchWidgetFolder());
		this.rebuildWidgets().catch((failure) => console.error("[widgetarium] the drifted builds could not be made", failure));

		this.assistant = createAssistant(this.app, this);
		this.registerView(AI_VIEW_TYPE, (leaf) => new AssistantView(leaf, this.assistant));
		this.addSettingTab(new WidgetariumSettingTab(this.app, this));
		this.assistant.layAgentFiles().catch((failure) => console.error("[widgetarium] the agent handbook was not written", failure));
		this.assistant.restore().catch((failure) => console.error("[widgetarium] the last conversation could not be read back", failure));
		this.app.workspace.onLayoutReady(() => this.showAssistant(false));
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.redrawAssistant()));

		this.addRibbonIcon("layout-grid", "Widgetarium: edit mode", () => this.toggleEditing());
		this.addRibbonIcon("replace", "Widgetarium: substitutions", () => this.showSubstitutions());
		this.addRibbonIcon("sparkles", "Widgetarium: ask the assistant", () => this.showAssistant());

		this.addCommand({
			id: "open-assistant",
			name: "Open the assistant",
			callback: () => this.showAssistant(),
		});

		this.addCommand({
			id: "clear-assistant-context",
			name: "Clear the assistant's context",
			callback: () => {
				this.assistant.forgetContext();
				new Notice("Widgetarium: the assistant forgot this conversation");
			},
		});

		this.addCommand({
			id: "configure-providers",
			name: "Configure AI providers",
			callback: () => this.assistant.openProviders(),
		});

		this.addCommand({
			id: "toggle-edit",
			name: "Toggle edit mode",
			callback: () => this.toggleEditing(),
		});

		this.addCommand({
			id: "create-board",
			name: "Create board",
			callback: () => this.createBoard(),
		});

		this.addCommand({
			id: "create-board-from-template",
			name: "Create board from template",
			callback: () => this.showTemplates(),
		});

		this.addCommand({
			id: "insert-board",
			name: "Insert board here",
			editorCallback: (editor) => this.insertBoard(editor),
		});

		this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => this.offerBoardIn(menu, file)));

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
			id: "edit-substitutions",
			name: "Edit substitutions",
			callback: () => this.showSubstitutions(),
		});

		this.addCommand({
			id: "browse-widgets",
			name: "Browse widgets",
			callback: () => this.showCatalogue(),
		});

		this.addCommand({
			id: "reload-widgets",
			name: "Reload widgets",
			callback: async () => {
				await measure("registry.load on demand", () => this.registry.load());
				this.refresh();
				new Notice(`Widgetarium: ${this.registry.list().length} widgets`);
			},
		});

		trace("onload done", { ms: Math.round(performance.now() - startedAt) });
	}

	// CONTEXT: the palette has no board under it, so browsing is the one mode whose press adds
	// nothing anywhere — the detail page behind it is step 6 of docs/widget-catalogue.md
	spent() {
		console.table(spentSoFar());
		return spentSoFar();
	}

	forgetSpent() {
		forgetSpent();
	}

	// TRADE-OFF: every offer is compiled to draw its card, so it waits for somebody to look
	async offers() {
		try {
			this.available ??= (await this.installer.available()).map(drawable);
		} catch (failure) {
			console.error(failure);
			new Notice(OFFERS_REFUSED.replace("{reason}", String(failure?.message ?? failure)));
			this.available = [];
		}
		return this.available;
	}

	async showAssistant(reveal = true) {
		const held = this.app.workspace.getLeavesOfType(AI_VIEW_TYPE);
		const leaf = held[0] ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		if (held.length === 0) await leaf.setViewState({ type: AI_VIEW_TYPE, active: false });
		if (reveal) this.app.workspace.revealLeaf(leaf);
	}

	redrawAssistant() {
		for (const leaf of this.app.workspace.getLeavesOfType(AI_VIEW_TYPE)) leaf.view?.draw?.();
	}

	showCatalogue() {
		return this.openCatalogueAs("browse");
	}

	showTemplates(folder) {
		return this.openCatalogueAs("template", folder);
	}

	templateBuilderInto(folder) {
		return async (template, onStep) => {
			const done = await this.useTemplate(template, folder, onStep);
			if (done.ok) this.catalogue?.close();
			return done;
		};
	}

	async openCatalogueAs(mode, folder) {
		this.catalogue?.close();
		this.catalogue = openCatalogue({
			registry: this.registry,
			host: this.host,
			mode,
			available: await this.offers(),
			templates: TEMPLATES,
			lock: await this.installer.lock(),
			onInstall: (entry, onStep) => this.install(entry, onStep),
			onUninstall: (id) => this.uninstall(id),
			onUseTemplate: this.templateBuilderInto(folder),
			onClose: () => {
				this.catalogue = null;
			},
		});
	}

	// CONTEXT: fetching runs somebody's code in this plugin's own realm, so it is pinned to the
	// commit it resolved to and nothing here ever re-fetches on its own
	async install(entry, onStep) {
		const done = await this.installer.install(entry, onStep);
		if (!done.ok) return done;
		await this.rereadWidgets();
		const said = done.isNewGeneration ? INSTALLED_BESIDE : INSTALLED_AT;
		new Notice(said.replace("{widget}", entry.manifest.id).replace("{commit}", done.commit.slice(0, 7)));
		return done;
	}

	async installAt(ref) {
		const done = await this.installer.installAt(ref, await this.offers());
		if (!done.ok) {
			new Notice(INSTALL_AT_REFUSED.replace("{widget}", ref).replace("{why}", done.failure));
			return done;
		}
		await this.rereadWidgets();
		return done;
	}

	async uninstall(id) {
		const done = await this.installer.uninstall(id);
		if (!done.ok) {
			new Notice(`Widgetarium: ${id} was not removed — ${done.failure}`);
			return done;
		}
		await this.rereadWidgets();
		new Notice(`Widgetarium: removed ${id}`);
		return done;
	}

	async rereadWidgets() {
		this.signature = await this.widgetSignature();
		await this.registry.load();
		this.available = null;
		const available = await this.offers();
		this.catalogue?.redraw({ available, lock: await this.installer.lock() });
		this.refresh();
	}

	// TRADE-OFF: the installer is driven directly rather than through install(), so a template standing on six widgets neither shows six notices nor rereads the registry six times
	async fetchWidgetsFor(template, onStep) {
		const named = templateWidgets(template);
		await this.wanted.want(named, onStep);
		const failure = named.map((id) => (this.registry.get(id) ? null : this.wanted.refusalOf(id))).find(Boolean);
		return failure ? { ok: false, failure } : { ok: true, failure: null };
	}

	async useTemplate(template, folder, onStep) {
		try {
			const fetched = await this.fetchWidgetsFor(template, onStep);
			if (!fetched.ok) return fetched;
			onStep?.(null);
			await createBoardNote(this.app, folder, { board: templateBoard(template), name: template.title });
			return { ok: true, failure: null };
		} catch (failure) {
			console.error(failure);
			return { ok: false, failure: String(failure?.message ?? failure) };
		}
	}

	async showSubstitutions() {
		this.closeSubstitutions?.();
		this.closeSubstitutions = openSubstitutions({
			rules: this.rules,
			registry: this.registry,
			host: this.host,
			available: await this.offers(),
			onInstall: (entry) => this.install(entry),
			onChange: (next) => this.setRules(next),
			onClose: () => {
				this.closeSubstitutions = null;
			},
		});
	}

	async saveShapes(next) {
		await this.saveData({ ...((await this.loadData()) ?? {}), shapes: next });
	}

	async addedRegistries() {
		const stored = (await this.loadData())?.registries;
		return Array.isArray(stored) ? stored : [];
	}

	async setRules(next) {
		traceSub("rules changed", () => ({ was: this.rules.length, now: next.length, live: activeRules(next).length }));
		this.rules = next;
		await this.saveData({ ...((await this.loadData()) ?? {}), substitutions: next });
		traceSub("rules saved", { rules: next.length });
		this.rerenderNotes();
	}

	// CONTEXT: a substitution is applied while a note renders, so nothing changes until it does
	rerenderNotes() {
		const leaves = this.app.workspace.getLeavesOfType("markdown");
		traceSub("rerender open notes", () => ({
			leaves: leaves.length,
			redrawable: leaves.filter((leaf) => leaf.view?.previewMode?.rerender).length,
		}));
		for (const leaf of leaves) {
			leaf.view?.previewMode?.rerender?.(true);
		}
		traceSub("rerender open notes done", { leaves: leaves.length });
	}

	queueWrite(sourcePath, blockIndex, board, editorBlock) {
		if (blockIndex < 0) return;
		this.pending ??= new Map();
		this.pending.set(`${sourcePath}#${blockIndex}`, { sourcePath, blockIndex, board, editorBlock });

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
			} catch (failure) {
				console.error(`[widgetarium] the board in ${key} was not written`, failure);
			} finally {
				this.inFlight.delete(key);
			}
		}
	}

	async writeBlock(job) {
		const block = `${job.sourcePath}#${job.blockIndex}`;
		const body = stringifyYaml(serializeBoard(job.board));
		const holdsEveryTile = (written) => parseYaml(written)?.tiles?.length === job.board.tiles.length;
		if (!holdsEveryTile(body)) {
			console.error(`[widgetarium] write to ${block} cancelled: the serialized board lost tiles`);
			return;
		}
		const through = writeInEditor(job.editorBlock, body) ? "editor" : "file";
		trace("write", { block, tiles: job.board.tiles.length, placed: placedIds(job.board).size, through });
		if (through === "file") await this.writeFileBlock(job, body, holdsEveryTile);
	}

	async writeFileBlock(job, body, holdsEveryTile) {
		const file = this.app.vault.getAbstractFileByPath(job.sourcePath);
		if (!(file instanceof TFile)) {
			console.error(`[widgetarium] write cancelled: ${job.sourcePath} is no longer a note`);
			return;
		}
		await this.app.vault.process(file, (text) => {
			const next = replaceBlock(text, job.blockIndex, body, holdsEveryTile);
			if (next !== null) return next;
			console.error(`[widgetarium] write to ${job.sourcePath}#${job.blockIndex} cancelled: block not found or the result would be malformed`);
			return text;
		});
	}

	async isAuthoringWidgetsHere() {
		return (await this.installer.folderSourcePaths()).length > 0;
	}

	// TRADE-OFF: a poll, because a dot folder emits no vault event; only an author here pays it
	async watchWidgetFolder() {
		this.signature = await this.widgetSignature();
		this.registerInterval(window.setInterval(() => this.pollWidgets(), WIDGET_POLL_MS));
	}

	async widgetSignature() {
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(WIDGETS_DIR))) return "";

		const scopes = (await adapter.list(WIDGETS_DIR)).folders;
		const folders = (await Promise.all(scopes.map((scope) => adapter.list(scope)))).flatMap((held) => held.folders);
		const files = (await Promise.all(folders.map((folder) => adapter.list(folder)))).flatMap((held) => held.files);
		const stamped = await Promise.all(
			files.map(async (file) => {
				const stat = await adapter.stat(file);
				return `${file}:${stat?.mtime ?? 0}:${stat?.size ?? 0}`;
			}),
		);
		return stamped.join("|");
	}

	async pollWidgets() {
		if (this.isPolling || this.mounts.size === 0) return;
		this.isPolling = true;
		try {
			const signature = await this.widgetSignature();
			if (signature !== this.signature) {
				this.signature = signature;
				await this.rebuildWidgets();
				await this.registry.load();
				this.refresh();
			}
		} finally {
			this.isPolling = false;
		}
	}

	async rebuildWidgets() {
		const done = await this.installer.rebuildDrifted();
		if (done.rebuilt.length > 0) {
			await this.registry.load();
			this.refresh();
		}
		if (done.failures.length > 0) new Notice(`Widgetarium: ${done.failures.map((each) => each.id).join(", ")} did not build — the console says why`);
	}

	onunload() {
		// the key is the block, so the element lives on the record — iterating keys here
		// handed render() a string and left every surface mounted
		clearTimeout(this.writeTimer);
		// the catalogue is portalled onto <body>, so it outlives the plugin unless taken down
		this.catalogue?.close();
		this.closeSubstitutions?.();
		this.assistant?.close();
		// the widget stylesheets live in document.head and outlive the plugin unless dropped
		this.registry?.dropStyles?.();
		// a held-back write must not die with the plugin
		if (this.pending?.size) this.flushWrites().catch((failure) => console.error(failure));
		for (const mount of this.mounts.values()) render(null, mount.element);
		this.header.clear();
		this.mounts.clear();
	}

	async ensureFolders() {
		const adapter = this.app.vault.adapter;
		for (const folder of [WIDGETS_DIR, COMPONENTS_DIR]) {
			if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
		}
	}

	setEditing(on) {
		if (this.editing === on) return;
		this.editing = on;
		this.refresh();
		this.header.sync();
	}

	toggleEditing() {
		this.setEditing(!this.editing);
		new Notice(this.editing ? "Widgetarium: editing on" : "Widgetarium: editing off");
	}

	offerBoardIn(menu, file) {
		if (!(file instanceof TFolder)) return;
		menu.addItem((item) =>
			item
				.setTitle("New Widgetarium board")
				.setIcon("layout-grid")
				// TRADE-OFF: the section id is read off the menu's DOM, not the API; a wrong one only strands the item in its own group
				.setSection("action-primary")
				.onClick(() => this.createBoard(file)),
		);
		menu.addItem((item) =>
			item
				.setTitle("New Widgetarium board from template")
				.setIcon("layout-template")
				.setSection("action-primary")
				.onClick(() => this.showTemplates(file)),
		);
	}

	async createBoard(folder) {
		try {
			const file = await createBoardNote(this.app, folder);
			this.setEditing(true);
			return file;
		} catch (failure) {
			console.error(failure);
			new Notice(BOARD_REFUSED.replace("{reason}", String(failure?.message ?? failure)));
			return null;
		}
	}

	insertBoard(editor) {
		if (!insertBoardAtCursor(editor)) {
			new Notice(BOARD_NOT_INSERTED);
			return;
		}
		this.setEditing(true);
	}

	refresh() {
		for (const mount of this.mounts.values()) mount.draw();
	}

	firstMountIn(sourcePath) {
		if (!sourcePath) return null;
		const mine = [...this.mounts.entries()].filter(([key]) => key.startsWith(`${sourcePath}#`)).map(([, mount]) => mount);
		return mine.sort((one, other) => (one.blockIndex ?? 0) - (other.blockIndex ?? 0))[0] ?? null;
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
		node.className = "wg-mount interactive-child";
		element.appendChild(node);

		// bound ONCE per mount, not per draw: a fresh host object every frame would change
		// the identity every widget compares against
		const mount = { element, node, state: { board }, save, screen, width: 0, host: bindNote(this.host, context.sourcePath) };
		mount.draw = () => {
			measure("surface draw", () =>
			render(
				h(WidgetSurface, {
					board: mount.state.board,
					boardNode: mount.node,
					registry: this.registry,
					host: mount.host,
					editing: this.editing,
					onActions: (actions) => this.header.hold(mount, actions),
					screen: mount.screen,
					// handed back so a rebuilt element starts at the width the old one had
					initialWidth: mount.width,
					onWidth: (value) => {
						mount.width = value;
					},
					onChange: (next) => mount.commit(next),
					onDrafting: (drafting) => {
						mount.drafting = drafting;
					},
				}),
				mount.node,
			));
		};
		mount.commit = (next) => {
			mount.state.board = next;
			mount.draw();
			mount.save(next);
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
				this.header.sync();
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
		return isScreenNote(this.app.metadataCache.getFileCache(file)?.frontmatter);
	}

	renderBlock(source, element, context) {
		return measure("renderBlock", () => this.drawBlock(source, element, context));
	}

	drawBlock(source, element, context) {
		let board;
		try {
			const parsed = parseYaml(source) ?? [];
			const refusal = blockRefusal(parsed);
			if (refusal) {
				element.createEl("pre", { text: refusal });
				return;
			}
			board = normalizeBoard(
				parsed,
				(id) => this.registry.resolveId(id),
				(id) => declaredName(this.registry, id),
			);
		} catch (failure) {
			element.createEl("pre", { text: `Widgetarium: cannot read YAML — ${failure}` });
			return;
		}

		this.wanted?.want(widgetsNamedBy(board.tiles));

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
			this.queueWrite(context.sourcePath, writeIndex, next, {
				replaceCode: context.replaceCode,
				section: () => context.getSectionInfo(element),
			});
		};

		const mounted = this.mount(element, board, save, this.isScreen(context.sourcePath), context, blockKey);
		if (blockIndex >= 0) mounted.blockIndex = blockIndex;
	}

}

