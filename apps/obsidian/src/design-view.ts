import { ItemView, Notice } from "obsidian";
import { boardIn } from "./board-in-note.js";
import { movedNode } from "@widgetarium/core/engine/node-moves.js";
import type { LayerMove } from "./layer-moves.js";
import type { App, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import type { Board } from "@widgetarium/core/model.js";
import {
	designPathOf,
	readDesign,
	referencePathOf,
	screenPathOf,
	statesOf,
	vaultBindingOf,
} from "@widgetarium/core/app-design.js";
import type { Design, ScreenState } from "@widgetarium/core/app-design.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { appWidgetsOf } from "@widgetarium/core/app-widgets.js";
import { readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import { LOCK_PATH } from "@widgetarium/core/paths.js";
import type { CanvasMode } from "./design-tools.js";
import { DesignCanvas } from "./design-canvas.js";
import { WIDGETS_PAGE } from "./design-canvas-page.js";
import { widgetOpenerOf } from "./design-references.js";
import { statePropsOf } from "./design-state-drawing.js";
import { blockIdOf, blocksOf, withBlocks } from "./design-block-registry.js";
import type { DrawnDesign, DrawnState, StatePicture } from "./design-canvas-shapes.js";
import { addPhotos, imageFilesIn } from "./design-photos.js";
import type WidgetariumPlugin from "./main.js";
import type { Job } from "@widgetarium/core/app-jobs.js";
import { NO_DOCS } from "./design-docs.js";
import { docsOf } from "./design-docs-read.js";
import type { JobControls } from "./design-job.js";

export const DESIGN_VIEW_TYPE = "widgetarium-design";

const TITLE = "Design · {app}";
const NO_BOARD = "{name} holds no widgetarium board";
const BOUND_TO_VAULT =
	"{name} reads the vault ({binding}): a design is drawn from sample rows only. Ask the agent to redraw it.";
const DESIGN_POLL_MS = 1500;
const DRAFT_PREFIX = "@draft/";
const NO_DESIGN = "{app} has no design yet, or it was removed.";
const PHOTOS_FAILED = "The photos were not added to the canvas: {why}";
const NO_PAGE_FOLDER = "{widget} has no folder in this vault, so its layout cannot be changed here.";
const NOT_MOVED = "Nothing was moved: {why}";
const JOBS_REDRAW_MS = 400;

export class DesignView extends ItemView {
	private appName = "";
	private page = "";
	private isLayersOpen = false;
	private mode: CanvasMode = "hand";
	private focusWidget: string | null = null;
	private readonly onFocusedWidget = (): void => {
		this.focusWidget = null;
	};
	private node: HTMLElement | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: WidgetariumPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return DESIGN_VIEW_TYPE;
	}

	getDisplayText(): string {
		return TITLE.replace("{app}", this.appName);
	}

	override getIcon(): string {
		return "layout-dashboard";
	}

	override getState(): Record<string, unknown> {
		return { app: this.appName, page: this.page, layers: this.isLayersOpen, mode: this.mode };
	}

	override async setState(state: unknown, result: ViewStateResult): Promise<void> {
		this.appName = isObject(state) && typeof state["app"] === "string" ? state["app"] : "";
		this.page = isObject(state) && typeof state["page"] === "string" ? state["page"] : "";
		this.isLayersOpen = isObject(state) && state["layers"] === true;
		this.mode = isObject(state) && state["mode"] === "pointer" ? "pointer" : "hand";
		await super.setState(state, result);
		refreshHeader(this.leaf);
		await this.draw();
	}

	override async onOpen(): Promise<void> {
		this.contentEl.addClass("wg-design-view");
		this.node = this.contentEl.createDiv({ cls: "wg-mount wg-design-mount" });
		shieldFromEditor(this.node);
		await this.plugin.started;
		const watched = new ResizeObserver(() => void this.draw());
		watched.observe(this.contentEl);
		this.register(() => watched.disconnect());
		this.registerInterval(window.setInterval(() => void this.redrawWhenChanged(), DESIGN_POLL_MS));
		this.registerDomEvent(document, "paste", (event) => this.pastePhotos(event));
		this.watchJobs();
		await this.draw();
	}

	private watchJobs(): void {
		let soon: number | null = null;
		const stop = this.plugin.assistant?.jobs.watch(() => {
			if (soon !== null) return;
			soon = window.setTimeout(() => {
				soon = null;
				void this.draw();
			}, JOBS_REDRAW_MS);
		});
		if (stop) this.register(stop);
	}

	private jobsNow(): readonly Job[] {
		return this.plugin.assistant?.jobs.jobsOf(this.appName) ?? [];
	}

	private async controlsNow(): Promise<JobControls> {
		const app = this.appName;
		const assistant = this.plugin.assistant;
		const held = assistant ? await assistant.settings.state() : null;
		const jobs = assistant?.jobs;
		const redrawn = (done: Promise<unknown> | undefined): void => void done?.then(() => this.draw());
		return {
			live: (id) => jobs?.liveOf(app, id) ?? null,
			start: (id) => redrawn(jobs?.start(app, id)),
			stop: (id) => redrawn(jobs?.stop(app, id)),
			openChat: () => void this.plugin.showAssistant(true),
			startsThemselves: held?.jobsStartThemselves ?? true,
		};
	}

	private pastePhotos(event: ClipboardEvent): void {
		if (this.app.workspace.getActiveViewOfType(DesignView) !== this) return;
		const photos = imageFilesIn(event.clipboardData?.files);
		if (photos.length === 0) return;
		event.preventDefault();
		void this.addPhotos(photos);
	}

	private async addPhotos(photos: readonly File[]): Promise<void> {
		try {
			await addPhotos(this.plugin.app.vault.adapter, this.appName, photos);
		} catch (failure) {
			console.error("[widgetarium] design photos were not added", failure);
			new Notice(PHOTOS_FAILED.replace("{why}", failure instanceof Error ? failure.message : String(failure)));
		}
		await this.draw();
	}

	private seen = "";

	private async redrawWhenChanged(): Promise<void> {
		if (!this.appName) return;
		const adapter = this.plugin.app.vault.adapter;
		const stats = await Promise.all(
			[designPathOf(this.appName), specPathOf(this.appName)].map((path) => adapter.stat(path).catch(() => null)),
		);
		const blocksNow = this.drawnDrafts.map((draft) => blocksOf(this.plugin.registry, draft).join(",")).join(";");
		const buildsNow = this.drawnWidgets.map((id) => this.plugin.registry.get(id)?.buildKey ?? "").join(",");
		const now = [...stats.map((stat) => String(stat?.mtime ?? "")), blocksNow, buildsNow].join("|");
		if (this.seen !== "" && now !== this.seen) await this.draw();
		this.seen = now;
	}

	private drawnDrafts: string[] = [];
	private drawnWidgets: string[] = [];

	override async onClose(): Promise<void> {
		if (this.node) render(null, this.node);
		this.node = null;
	}

	private async draw(): Promise<void> {
		const node = this.node;
		const size = { width: this.contentEl.clientWidth, height: this.contentEl.clientHeight };
		if (!node || !this.appName || size.width === 0 || size.height === 0) return;
		const jobs = this.jobsNow();
		const docs = await docsOf(this.plugin, this.appName);
		const isStarting = jobs.length > 0 || docs !== NO_DOCS;
		const { screens, references, widgets } = await designOf(this.plugin, this.appName, isStarting);
		this.drawnDrafts = draftsOn(screens);
		this.drawnWidgets = widgetsDrawnOn(this.plugin, screens, widgets);
		const onAddPhotos = (photos: readonly File[]): void => void this.addPhotos(photos);
		const drawing = { registry: withBlocks(this.plugin.registry), host: this.plugin.host };
		const paging = { page: this.page, onPage: (page: string): void => this.turnTo(page) };
		const layering = {
			isLayersOpen: this.isLayersOpen,
			onLayers: (): void => this.toggleLayers(),
			mode: this.mode,
			onMode: (mode: CanvasMode): void => this.turnMode(mode),
			onMove: (widget: string, move: LayerMove): void => void this.moveLayer(widget, move),
		};
		const controls = await this.controlsNow();
		const opener = widgetOpenerOf(drawing.registry, (widget) => this.openWidget(widget));
		const focusing = { focusWidget: this.focusWidget, onFocusedWidget: this.onFocusedWidget };
		const design = { app: this.appName, screens, references, widgets, jobs, docs, controls, opener, size, onAddPhotos };
		render(h(DesignCanvas, { key: this.page, ...design, ...focusing, ...paging, ...layering, ...drawing }), node);
	}

	private turnMode(mode: CanvasMode): void {
		this.mode = mode;
		this.app.workspace.requestSaveLayout();
		void this.draw();
	}

	private toggleLayers(): void {
		this.isLayersOpen = !this.isLayersOpen;
		this.app.workspace.requestSaveLayout();
		void this.draw();
	}

	private async moveLayer(widget: string, move: LayerMove): Promise<void> {
		const folder = this.plugin.registry.get(widget)?.folder;
		if (!folder) return void new Notice(NO_PAGE_FOLDER.replace("{widget}", widget));
		const path = `${folder}/${move.file}`;
		const adapter = this.plugin.app.vault.adapter;
		const moved = movedNode(await adapter.read(path), move);
		if ("refusal" in moved) return void new Notice(NOT_MOVED.replace("{why}", moved.refusal));
		await adapter.write(path, moved.source);
	}

	private openWidget(widget: string): void {
		this.focusWidget = widget;
		this.turnTo(WIDGETS_PAGE);
	}

	private turnTo(page: string): void {
		this.page = page;
		this.app.workspace.requestSaveLayout();
		void this.draw();
	}
}

export function registerDesignView(plugin: WidgetariumPlugin): void {
	plugin.registerView(DESIGN_VIEW_TYPE, (leaf) => new DesignView(leaf, plugin));
}

export async function openDesign(obsidian: App, app: string, page?: string): Promise<void> {
	const open = obsidian.workspace.getLeavesOfType(DESIGN_VIEW_TYPE).find((held) => held.view.getState()["app"] === app);
	const leaf = open ?? obsidian.workspace.getLeaf("tab");
	const kept = open?.view.getState() ?? {};
	await leaf.setViewState({ type: DESIGN_VIEW_TYPE, active: true, state: { ...kept, app, ...(page ? { page } : {}) } });
	await obsidian.workspace.revealLeaf(leaf);
}

export async function designOf(plugin: WidgetariumPlugin, app: string, isStarting = false): Promise<DrawnDesign> {
	const text = await plugin.app.vault.adapter.read(designPathOf(app)).catch(() => null);
	if (text === null && isStarting) return { screens: [], references: [], widgets: [] };
	if (text === null) return refusedDesign(app, NO_DESIGN.replace("{app}", app));
	const read = readDesign(text);
	if (read.refusal !== undefined) return refusedDesign(app, read.refusal);
	const screens = await drawnScreensOf(plugin, app, read.design.screens);
	const references = drawnReferencesOf(plugin, app, read.design.references);
	return { screens, references, widgets: await widgetsOf(plugin, app, screens) };
}

function drawnScreensOf(
	plugin: WidgetariumPlugin,
	app: string,
	screens: Design["screens"],
): Promise<DrawnDesign["screens"]> {
	return Promise.all(
		screens.map(async (screen) => ({
			name: screen.name,
			states: await Promise.all(statesOf(screen).map((state) => stateOf(plugin, app, state, screen.name))),
		})),
	);
}

function drawnReferencesOf(
	plugin: WidgetariumPlugin,
	app: string,
	references: Design["references"],
): DrawnDesign["references"] {
	const adapter = plugin.app.vault.adapter;
	return references.map((reference) => ({
		name: "url" in reference ? reference.url : reference.file,
		src: "url" in reference ? reference.url : adapter.getResourcePath(referencePathOf(app, reference.file)),
		why: reference.why,
		kind: reference.kind,
		pages: reference.pages ?? [],
		notes: reference.notes ?? [],
	}));
}

async function widgetsOf(
	plugin: WidgetariumPlugin,
	app: string,
	screens: DrawnDesign["screens"],
): Promise<DrawnDesign["widgets"]> {
	const pages = new Set(widgetsOnScreens(screens));
	const onScreens = [...pages].flatMap((id) => plugin.registry.get(id)?.uses ?? []);
	const used = appWidgetsOf([...(await specWidgetsOf(plugin, app)), ...onScreens], await catalogueInstallsOf(plugin));
	const isShown = (id: string): boolean => Boolean(plugin.registry.get(id)?.component) && !pages.has(id);
	return [
		...used.fromCatalogue.filter(isShown).map((id) => ({ id, isFromCatalogue: true })),
		...[...draftBlocksOf(plugin, screens), ...used.made.filter(isShown)].map((id) => ({ id, isFromCatalogue: false })),
	];
}

function draftBlocksOf(plugin: WidgetariumPlugin, screens: DrawnDesign["screens"]): string[] {
	return draftsOn(screens).flatMap((draft) => blocksOf(plugin.registry, draft).map((block) => blockIdOf(draft, block)));
}

function widgetsDrawnOn(
	plugin: WidgetariumPlugin,
	screens: DrawnDesign["screens"],
	widgets: DrawnDesign["widgets"],
): string[] {
	const pages = widgetsOnScreens(screens);
	const used = pages.flatMap((id) => plugin.registry.get(id)?.uses ?? []);
	return [...new Set([...pages, ...used, ...widgets.map((widget) => widget.id)])];
}

function isDraft(id: string): boolean {
	return id.startsWith(DRAFT_PREFIX);
}

function widgetsOnScreens(screens: DrawnDesign["screens"]): string[] {
	const tiles = screens.flatMap((screen) => screen.states.flatMap((state) => state.board?.tiles ?? []));
	return tiles.map((tile) => tile.widget);
}

function draftsOn(screens: DrawnDesign["screens"]): string[] {
	return [...new Set(widgetsOnScreens(screens).filter(isDraft))];
}

async function specWidgetsOf(plugin: WidgetariumPlugin, app: string): Promise<string[]> {
	const text = await plugin.app.vault.adapter.read(specPathOf(app)).catch(() => null);
	const read = text === null ? null : readSpec(text);
	if (!read?.spec) return [];
	const named = read.spec.features.flatMap((feature) => (feature.widget ? [feature.widget] : []));
	const pageNotes = read.spec.pages.flatMap((page) => (page.note ? [page.note] : []));
	const onPages = await Promise.all(pageNotes.map((note) => widgetsOnNote(plugin, note)));
	return [...named, ...onPages.flat()];
}

async function widgetsOnNote(plugin: WidgetariumPlugin, note: string): Promise<string[]> {
	const text = await plugin.app.vault.adapter.read(note).catch(() => "");
	return boardIn(text)?.tiles.map((tile) => tile.widget) ?? [];
}

async function catalogueInstallsOf(plugin: WidgetariumPlugin): Promise<string[]> {
	const text = await plugin.app.vault.adapter.read(LOCK_PATH).catch(() => "");
	try {
		const lock: unknown = JSON.parse(text);
		return isObject(lock) && isObject(lock["widgets"]) ? Object.keys(lock["widgets"]) : [];
	} catch {
		return [];
	}
}

function refusedDesign(app: string, refusal: string): DrawnDesign {
	return {
		screens: [{ name: app, states: [{ name: app, board: null, refusal }] }],
		references: [],
		widgets: [],
	};
}

async function stateOf(
	plugin: WidgetariumPlugin,
	app: string,
	state: ScreenState,
	screen: string,
): Promise<DrawnState> {
	const text = await plugin.app.vault.adapter.read(screenPathOf(app, state.file)).catch(() => "");
	const board = boardIn(text);
	if (!board) return { name: state.name, board, refusal: NO_BOARD.replace("{name}", state.file) };
	const picture = pictureOf(plugin, board, state.name === screen ? null : state.name);
	if (picture) return { name: state.name, board, picture };
	const binding = vaultBindingOf(board);
	if (!binding) return { name: state.name, board };
	const refusal = BOUND_TO_VAULT.replace("{name}", state.file).replace("{binding}", binding);
	return { name: state.name, board: null, refusal };
}

function pictureOf(plugin: WidgetariumPlugin, board: Board, state: string | null): StatePicture | null {
	const [tile] = board.tiles;
	if (!tile || board.tiles.length > 1) return null;
	const props = statePropsOf(plugin.registry.get(tile.widget)?.states ?? {}, state);
	return props ? { widget: tile.widget, props } : null;
}

function refreshHeader(leaf: unknown): void {
	if (isObject(leaf) && typeof leaf["updateHeader"] === "function") Reflect.apply(leaf["updateHeader"], leaf, []);
}
