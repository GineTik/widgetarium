import { Plugin, TFile, TFolder, Notice } from "obsidian";
import { watchWidgetScopes } from "./widget-watch.js";
import { render } from "@widgetarium/core/engine/render.js";
import { WidgetRegistry } from "@widgetarium/core/registry.js";
import { REACT_SURFACE_SOURCE } from "widgetarium:surface";
import { createHost } from "./host.js";
import { AI_VIEW_TYPE } from "./ai/view.js";
import { WIDGETS_DIR, COMPONENTS_DIR } from "@widgetarium/core/paths.js";
import { trace, traceSub, setTracing, tracing, measure, spentSoFar, forgetSpent } from "@widgetarium/core/trace.js";
import { shapesOf } from "@widgetarium/kit/shapes";
import { normalizeRules, activeRules, ruleBlock } from "./substitution.js";
import { createBoardNote, insertBoardAtCursor, isScreenNote } from "./board-note.js";
import { pluginInstaller } from "./widget-offers.js";
import { addCommandsAndRibbon } from "./plugin-commands.js";
import { flushWrites, writeBlock } from "./board-writes.js";
import { mountBoardByBlock } from "./board-mount.js";
import { drawBlock } from "./draw-block.js";
import { installAt, offersOf, openCatalogueAs, showSubstitutions } from "./plugin-catalogue.js";
import {
	headerActionsOf,
	registerRenderersBeforeFirstNote,
	shapeStoreFollowingRenames,
	startAssistant,
	wantedWidgetsOf,
} from "./plugin-setup.js";

export { drawable } from "./widget-offers.js";

const WIDGET_POLL_MS = 1000;
const AFTER_FIRST_DRAW_MS = 3000;
const WIDGETS_NOT_REREAD = "Widgetarium: the changed widgets could not be read again — the console says why";
const BOARD_REFUSED = "Widgetarium: the board was not created — {reason}";
const BOARD_NOT_INSERTED =
	"Widgetarium: this note has a code fence that was never closed, so there is nowhere safe to put a board. Close the fence and try again.";

export default class WidgetariumPlugin extends Plugin {
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
		this.header = headerActionsOf(this);
		this.registerEvent(this.app.workspace.on("layout-change", () => this.header.sync()));
		this.registry = new WidgetRegistry(this.app, REACT_SURFACE_SOURCE);
		this.shapeAnswers = {};
		this.shapes = shapeStoreFollowingRenames(this);
		this.host = createHost(this.app, this);
		this.rules = [];
		registerRenderersBeforeFirstNote(this);
		this.installer = pluginInstaller(this);
		this.wanted = wantedWidgetsOf(this);
		this.started = this.startUp().catch((failure) =>
			console.error("[widgetarium] the widgets could not be read", failure),
		);
		startAssistant(this);
		addCommandsAndRibbon(this);
		trace("onload done", { ms: Math.round(performance.now() - startedAt) });
	}

	spent() {
		console.table(spentSoFar());
		return spentSoFar();
	}

	forgetSpent() {
		forgetSpent();
	}

	offers() {
		return offersOf(this);
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
		return openCatalogueAs(this, "browse");
	}

	showTemplates(folder) {
		return openCatalogueAs(this, "template", folder);
	}

	showSubstitutions() {
		return showSubstitutions(this);
	}

	installAt(ref) {
		return installAt(this, ref);
	}

	async rereadWidgets() {
		this.signature = await this.widgetSignature();
		await this.registry.load();
		this.available = null;
		const available = await this.offers();
		this.catalogue?.redraw({ available, lock: await this.installer.lock() });
		this.refresh();
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
		this.rerenderNotesSoSubstitutionsApply();
	}

	rerenderNotesSoSubstitutionsApply() {
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

	flushWrites() {
		return flushWrites(this);
	}

	writeBlock(job) {
		return writeBlock(this, job);
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
				await this.widgetsChanged();
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
		if (done.failures.length > 0)
			new Notice(
				`Widgetarium: ${done.failures.map((each) => each.id).join(", ")} did not build — the console says why`,
			);
	}

	onunload() {
		clearTimeout(this.writeTimer);
		clearTimeout(this.afterFirstDraw);
		this.catalogue?.close();
		this.closeSubstitutions?.();
		this.assistant?.close();
		this.registry?.dropStyles?.();
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
		const mine = [...this.mounts.entries()]
			.filter(([key]) => key.startsWith(`${sourcePath}#`))
			.map(([, mount]) => mount);
		return mine.sort((one, other) => (one.blockIndex ?? 0) - (other.blockIndex ?? 0))[0] ?? null;
	}

	mount(element, board, save, screen, context, blockKey) {
		return mountBoardByBlock(this, element, board, save, screen, context, blockKey);
	}

	isScreen(sourcePath) {
		const file = this.app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) return false;
		return isScreenNote(this.app.metadataCache.getFileCache(file)?.frontmatter);
	}

	renderBlock(source, element, context) {
		return this.started.then(() => measure("renderBlock", () => this.drawBlock(source, element, context)));
	}

	async startUp() {
		await measure("onload · ensureFolders", () => this.ensureFolders());
		const [, stored] = await Promise.all([
			measure("onload · registry.load", () => this.registry.load()),
			measure("onload · loadData", () => this.loadData()),
		]);
		this.shapeAnswers = shapesOf(stored?.shapes);
		this.rules = normalizeRules(stored?.substitutions);
		traceSub("rules loaded", () => ({
			rules: this.rules.length,
			live: activeRules(this.rules).length,
			blocked: this.rules.filter(ruleBlock).map((rule) => `${rule.id} (${ruleBlock(rule)})`),
			widgets: this.rules.map((rule) => rule.widget),
		}));
		measure("onload · rerenderNotes", () => this.rerenderNotesSoSubstitutionsApply());
		// TRADE-OFF: a fixed wait, not "after every board drew" — a board may never be opened, and each disk question asked while boards draw queues behind theirs
		this.afterFirstDraw = window.setTimeout(
			() =>
				this.watchWidgets().catch((failure) =>
					console.error("[widgetarium] the widget folders are not watched", failure),
				),
			AFTER_FIRST_DRAW_MS,
		);
	}

	async watchWidgets() {
		const unwatch = this.watchedScopes();
		if (unwatch) this.register(unwatch);
		else if (await this.isAuthoringWidgetsHere()) await this.watchWidgetFolder();
		await this.queueWidgetWork(() => this.rebuildWidgets());
	}

	watchedScopes() {
		try {
			return watchWidgetScopes(this.app.vault.adapter, () => this.widgetsChanged());
		} catch (failure) {
			console.error("[widgetarium] the widget folders cannot be watched, so they are polled instead", failure);
			return null;
		}
	}

	widgetsChanged() {
		return this.queueWidgetWork(() => this.reloadWidgets());
	}

	queueWidgetWork(work) {
		this.widgetWork = (this.widgetWork ?? Promise.resolve()).then(work).catch((failure) => {
			console.error("[widgetarium] the widgets could not be read again", failure);
			new Notice(WIDGETS_NOT_REREAD);
		});
		return this.widgetWork;
	}

	async reloadWidgets() {
		await this.rebuildWidgets();
		await this.registry.load();
		this.refresh();
	}

	drawBlock(source, element, context) {
		return drawBlock(this, source, element, context);
	}
}
