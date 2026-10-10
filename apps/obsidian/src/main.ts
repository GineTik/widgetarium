import { Plugin, TFile, TFolder, Notice } from "obsidian";
import type { Editor, Menu, MarkdownPostProcessorContext, TAbstractFile, View } from "obsidian";
import { render } from "@widgetarium/core/engine/render.js";
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { StartupCache } from "@widgetarium/core/startup-snapshot.js";
import { setTracing, tracing, measure, spentSoFar, forgetSpent, traceSub } from "@widgetarium/core/trace.js";
import type { Board } from "@widgetarium/core/model.js";
import type { createWantedWidgets } from "@widgetarium/core/engine/widgets-wanted.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { AI_VIEW_TYPE, AssistantView } from "./ai/view.js";
import type { Assistant } from "./ai/assistant.js";
import { activeRules } from "./substitution.js";
import type { Rule } from "./substitution.js";
import { createBoardNote, insertBoardAtCursor, isScreenNote } from "./board-note.js";
import type { Installer, Drawn } from "./widget-offers.js";
import { flushWrites, writeBlock } from "./board-writes.js";
import type { WriteJob } from "./board-writes.js";
import { mountBoardByBlock } from "./board-mount.js";
import type { BoardMount, SaveBoard } from "./board-mount.js";
import { drawBlock } from "./draw-block.js";
import type { BlockContext } from "./draw-block.js";
import { installAt, offersOf, showSubstitutions } from "./plugin-catalogue.js";
import { CATALOGUE_VIEW_TYPE, DOCS_VIEW_TYPE, redrawBoardViews, revealBoardView } from "./catalogue-views.js";
import type { PluginCataloguePort } from "./catalogue-port.js";
import type { AvailableOffer, InstallAtAnswer } from "./plugin-catalogue.js";
import { startPlugin, startUp } from "./plugin-setup.js";
import { warmLikelyNotes } from "./note-warming.js";
import type { ShapeStore, Shapes } from "@widgetarium/kit/shapes";
import { widgetSignature, widgetsChanged } from "./widget-upkeep.js";
import type { HeaderActions } from "./header-actions.js";
import type { ObsidianHost } from "./host.js";

export { drawable } from "./widget-offers.js";

export type WantedWidgets = ReturnType<typeof createWantedWidgets>;

const BOARD_REFUSED = "Widgetarium: the board was not created — {reason}";
const BOARD_NOT_INSERTED =
	"Widgetarium: this note has a code fence that was never closed, so there is nowhere safe to put a board. Close the fence and try again.";

export default class WidgetariumPlugin extends Plugin {
	// TRADE-OFF: declared rather than built here, because Obsidian hands the plugin its app only at onload
	declare editing: boolean;
	declare mounts: Map<unknown, BoardMount>;
	declare header: HeaderActions;
	declare registry: WidgetRegistry;
	declare startupCache: StartupCache;
	declare shapeAnswers: Shapes;
	declare shapes: ShapeStore;
	declare host: ObsidianHost;
	declare rules: Rule[];
	declare installer: Installer;
	declare wanted: WantedWidgets;
	declare cataloguePort: PluginCataloguePort;
	declare started: Promise<void>;
	assistant: Assistant | null = null;
	available: Drawn<AvailableOffer>[] | null = null;
	templateFolder: TFolder | undefined = undefined;
	closeSubstitutions: (() => void) | null = null;
	signature = "";
	isPolling = false;
	widgetWork: Promise<void> | null = null;
	afterFirstDraw: number | undefined = undefined;
	pending?: Map<string, WriteJob>;
	inFlight?: Set<string>;
	writeTimer?: ReturnType<typeof setTimeout>;
	writing?: Promise<void>;

	get logging(): boolean {
		return tracing();
	}

	set logging(on: boolean) {
		setTracing(on);
	}

	override async onload(): Promise<void> {
		startPlugin(this);
		this.app.workspace.onLayoutReady(() => void measure("warm likely notes", () => warmLikelyNotes(this.app)));
	}

	spent(): ReturnType<typeof spentSoFar> {
		console.table(spentSoFar());
		return spentSoFar();
	}

	forgetSpent(): void {
		forgetSpent();
	}

	offers(): Promise<Drawn<AvailableOffer>[]> {
		return offersOf(this);
	}

	async showAssistant(reveal = true): Promise<void> {
		const held = this.app.workspace.getLeavesOfType(AI_VIEW_TYPE);
		const leaf = held[0] ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		if (held.length === 0) await leaf.setViewState({ type: AI_VIEW_TYPE, active: false });
		if (reveal) void this.app.workspace.revealLeaf(leaf);
	}

	redrawAssistant(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(AI_VIEW_TYPE)) {
			if (leaf.view instanceof AssistantView) void leaf.view.draw();
		}
	}

	showCatalogue(): Promise<void> {
		return revealBoardView(this, CATALOGUE_VIEW_TYPE);
	}

	showDocs(): Promise<void> {
		return revealBoardView(this, DOCS_VIEW_TYPE);
	}

	showTemplates(folder?: TFolder): Promise<void> {
		this.templateFolder = folder;
		return this.showCatalogue();
	}

	showSubstitutions(): Promise<void> {
		return showSubstitutions(this);
	}

	installAt(ref: string): Promise<InstallAtAnswer> {
		return installAt(this, ref);
	}

	async rereadWidgets(): Promise<void> {
		this.signature = await widgetSignature(this);
		await this.registry.load();
		this.available = null;
		await this.cataloguePort.reread();
		this.refresh();
	}

	async saveShapes(next: unknown): Promise<void> {
		await this.saveData({ ...storedObject(await this.loadData()), shapes: next });
	}

	async addedRegistries(): Promise<unknown[]> {
		const stored = storedObject(await this.loadData())["registries"];
		return Array.isArray(stored) ? stored : [];
	}

	async setRules(next: Rule[]): Promise<void> {
		traceSub("rules changed", () => ({ was: this.rules.length, now: next.length, live: activeRules(next).length }));
		this.rules = next;
		await this.saveData({ ...storedObject(await this.loadData()), substitutions: next });
		traceSub("rules saved", { rules: next.length });
		this.rerenderNotesSoSubstitutionsApply();
	}

	rerenderNotesSoSubstitutionsApply(): void {
		const leaves = this.app.workspace.getLeavesOfType("markdown");
		traceSub("rerender open notes", () => ({
			leaves: leaves.length,
			redrawable: leaves.filter((leaf) => rerendererOf(leaf.view) !== null).length,
		}));
		for (const leaf of leaves) rerendererOf(leaf.view)?.();
		traceSub("rerender open notes done", { leaves: leaves.length });
	}

	flushWrites(): Promise<void> {
		return flushWrites(this);
	}

	writeBlock(job: WriteJob): Promise<void> {
		return writeBlock(this, job);
	}

	override onunload(): void {
		clearTimeout(this.writeTimer);
		clearTimeout(this.afterFirstDraw);
		this.closeSubstitutions?.();
		this.assistant?.close();
		this.registry?.dropStyles?.();
		if (this.pending?.size) this.flushWrites().catch((failure: unknown) => console.error(failure));
		for (const mount of this.mounts.values()) render(null, mount.element);
		this.header.clear();
		this.mounts.clear();
	}

	setEditing(on: boolean): void {
		if (this.editing === on) return;
		this.editing = on;
		this.refresh();
		this.header.sync();
	}

	toggleEditing(): void {
		this.setEditing(!this.editing);
		new Notice(this.editing ? "Widgetarium: editing on" : "Widgetarium: editing off");
	}

	offerBoardIn(menu: Menu, file: TAbstractFile): void {
		if (!(file instanceof TFolder)) return;
		menu.addItem((item) =>
			item
				.setTitle("New Widgetarium board")
				.setIcon("layout-grid")
				// TRADE-OFF: the section id is read off the menu's DOM, not the API; a wrong one only strands the item in its own group
				.setSection("action-primary")
				.onClick(() => void this.createBoard(file)),
		);
		menu.addItem((item) =>
			item
				.setTitle("New Widgetarium board from template")
				.setIcon("layout-template")
				.setSection("action-primary")
				.onClick(() => void this.showTemplates(file)),
		);
	}

	async createBoard(folder?: TFolder): Promise<TFile | null> {
		try {
			const file = await createBoardNote(this.app, folder);
			this.setEditing(true);
			return file;
		} catch (failure) {
			console.error(failure);
			const reason = isObject(failure) ? (failure["message"] ?? failure) : failure;
			new Notice(BOARD_REFUSED.replace("{reason}", String(reason)));
			return null;
		}
	}

	insertBoard(editor: Editor): void {
		if (!insertBoardAtCursor(editor)) {
			new Notice(BOARD_NOT_INSERTED);
			return;
		}
		this.setEditing(true);
	}

	refresh(): void {
		for (const mount of this.mounts.values()) mount.draw();
		redrawBoardViews(this);
	}

	firstMountIn(sourcePath: string | null | undefined): BoardMount | null {
		if (!sourcePath) return null;
		const mine = [...this.mounts.entries()]
			.filter(([key]) => String(key).startsWith(`${sourcePath}#`))
			.map(([, mount]) => mount);
		return mine.sort((one, other) => (one.blockIndex ?? 0) - (other.blockIndex ?? 0))[0] ?? null;
	}

	mount(
		element: HTMLElement,
		board: Board,
		save: SaveBoard,
		screen: boolean,
		context: BlockContext,
		blockKey: string,
	): BoardMount {
		return mountBoardByBlock(this, { element, board, save, screen, context, blockKey });
	}

	isScreen(sourcePath: string): boolean {
		const file = this.app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) return false;
		return isScreenNote(this.app.metadataCache.getFileCache(file)?.frontmatter);
	}

	renderBlock(source: string, element: HTMLElement, context: MarkdownPostProcessorContext): Promise<void> {
		return this.started.then(() => measure("renderBlock", () => this.drawBlock(source, element, context)));
	}

	startUp(): Promise<void> {
		return startUp(this);
	}

	widgetsChanged(): Promise<void> {
		return widgetsChanged(this);
	}

	drawBlock(source: string, element: HTMLElement, context: BlockContext): void {
		drawBlock(this, source, element, context);
	}
}

function storedObject(stored: unknown): Readonly<Record<string, unknown>> {
	return isObject(stored) ? stored : {};
}

function rerendererOf(view: View | null | undefined): (() => void) | null {
	const previewMode: unknown = view ? Reflect.get(view, "previewMode") : undefined;
	const rerender = isObject(previewMode) ? previewMode["rerender"] : undefined;
	if (typeof rerender !== "function") return null;
	return () => Reflect.apply(rerender, previewMode, [true]);
}
