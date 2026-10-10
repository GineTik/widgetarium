import { ItemView, Notice, TFile } from "obsidian";
import { movedNode } from "@widgetarium/core/engine/node-moves.js";
import type { LayerMove } from "./layer-moves.js";
import type { App, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { Fragment, createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { designPathOf, readDesign, referencePathOf, statesOf } from "@widgetarium/core/app-design.js";
import type { Design } from "@widgetarium/core/app-design.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { appWidgetsOf } from "@widgetarium/core/app-widgets.js";
import { specPathOf } from "@widgetarium/core/app-spec.js";
import type { CanvasMode } from "./design-tools.js";
import { CanvasTopBar, DesignCanvas } from "./design-canvas.js";
import { COMPONENTS_PAGE, shownPageOf } from "./design-canvas-page.js";
import { noteToReturnTo, readAppSpec } from "./app-of-note.js";
import { widgetOpenerOf } from "./design-references.js";
import { readDrawnState } from "./design-drawn-state.js";
import { blockIdOf, blocksOf, withBlocks } from "./design-block-registry.js";
import type { DrawnDesign } from "./design-canvas-shapes.js";
import { addPhotos, imageFilesIn } from "./design-photos.js";
import type WidgetariumPlugin from "./main.js";
import type { Job } from "@widgetarium/core/app-jobs.js";
import { docsOf } from "./design-docs-read.js";
import type { JobControls } from "./design-job.js";
import { catalogueInstallsOf, specWidgetsOf } from "./design-spec-widgets.js";

export const DESIGN_VIEW_TYPE = "widgetarium-design";

const TITLE = "Design · {app}";
const DESIGN_POLL_MS = 1500;
const DRAFT_PREFIX = "@draft/";
const NO_DESIGN = "{app} has no design yet, or it was removed.";
const PHOTOS_FAILED = "The photos were not added to the canvas: {why}";
const NO_PAGE_FOLDER = "{widget} has no folder in this vault, so its layout cannot be changed here.";
const NOT_MOVED = "Nothing was moved: {why}";
const JOBS_REDRAW_MS = 400;
const NO_NOTE_TO_RETURN_TO = "{app} has no page with a note to go back to.";
const SPEC_REFUSED = "The spec of {app} cannot be read: {why}";

export class DesignView extends ItemView {
	private appName = "";
	private page = "";
	private shownPage = "";
	private fromNote = "";
	private isLayersOpen = false;
	private mode: CanvasMode = "hand";
	private focusWidget: string | null = null;
	private variants: Readonly<Record<string, string>> = {};
	private readonly onVariant = (page: string, screen: string): void => {
		this.variants = { ...this.variants, [page]: screen };
		void this.draw();
	};
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
		return { app: this.appName, page: this.page, fromNote: this.fromNote, layers: this.isLayersOpen, mode: this.mode };
	}

	override async setState(state: unknown, result: ViewStateResult): Promise<void> {
		this.appName = textIn(state, "app");
		this.page = textIn(state, "page");
		this.shownPage = "";
		this.fromNote = textIn(state, "fromNote");
		this.isLayersOpen = isObject(state) && state["layers"] === true;
		this.mode = isObject(state) && state["mode"] === "pointer" ? "pointer" : "hand";
		await super.setState(state, result);
		refreshHeader(this.leaf);
		await this.draw();
	}

	override async onOpen(): Promise<void> {
		this.contentEl.addClass("wg-design-view");
		this.node = this.contentEl.createDiv({ cls: "wg-mount wg-design-mount wg-portal" });
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

	private controlsNow(): JobControls {
		const app = this.appName;
		const jobs = this.plugin.assistant?.jobs;
		return {
			live: (id) => jobs?.liveOf(app, id) ?? null,
			stop: (id) => void jobs?.stop(app, id).then(() => this.draw()),
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
		const isStarting = jobs.length > 0 || docs.length > 0;
		const { screens, references, widgets } = await designOf(this.plugin, this.appName, isStarting);
		const keptPage = this.shownPage === this.page ? this.page : "";
		this.shownPage = shownPageOf(this.page, { screens, references, jobs, docs, keptPage });
		this.page ||= this.shownPage;
		this.drawnDrafts = draftsOn(screens);
		this.drawnWidgets = widgetsDrawnOn(this.plugin, screens, widgets);
		const onAddPhotos = (photos: readonly File[]): void => void this.addPhotos(photos);
		const drawing = { registry: withBlocks(this.plugin.registry), host: this.plugin.host };
		const paging = { page: this.page, keptPage, onPage: (page: string): void => this.turnTo(page) };
		const layering = {
			isLayersOpen: this.isLayersOpen,
			onLayers: (): void => this.toggleLayers(),
			mode: this.mode,
			onMode: (mode: CanvasMode): void => this.turnMode(mode),
			onReturn: (): void => void this.returnToAppNote(),
			onMove: (widget: string, move: LayerMove): void => void this.moveLayer(widget, move),
		};
		const controls = this.controlsNow();
		const opener = widgetOpenerOf(drawing.registry, (widget) => this.openWidget(widget));
		const focusing = { focusWidget: this.focusWidget, onFocusedWidget: this.onFocusedWidget };
		const pick = { variants: this.variants, onVariant: this.onVariant };
		const design = { app: this.appName, screens, references, widgets, jobs, docs, controls, opener, size, onAddPhotos };
		const canvas = { ...design, ...focusing, pick, ...paging, ...layering, ...drawing };
		const fieldOf = (): HTMLElement | null => node.querySelector<HTMLElement>(".wg-design-field");
		render(
			h(Fragment, null, [
				h(DesignCanvas, { key: this.page, ...canvas }),
				h(CanvasTopBar, { key: "top", ...canvas, fieldOf }),
			]),
			node,
		);
	}

	async returnToAppNote(): Promise<void> {
		const read = await readAppSpec(this.app.vault.adapter, this.appName);
		if (read?.refusal !== undefined) {
			console.error("[widgetarium] the canvas cannot return to the app", read.refusal);
			return void new Notice(SPEC_REFUSED.replace("{app}", this.appName).replace("{why}", read.refusal));
		}
		const note = noteToReturnTo(read?.spec.pages ?? [], this.shownPage, this.fromNote);
		const file = note && this.app.vault.getAbstractFileByPath(note);
		if (!(file instanceof TFile)) return void new Notice(NO_NOTE_TO_RETURN_TO.replace("{app}", this.appName));
		await this.leaf.openFile(file, { active: true });
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
		this.turnTo(COMPONENTS_PAGE);
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

export async function openDesignInLeaf(
	leaf: WorkspaceLeaf,
	app: string,
	page: string,
	fromNote: string,
): Promise<void> {
	await leaf.setViewState({ type: DESIGN_VIEW_TYPE, active: true, state: { app, page, fromNote } });
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
	const source = {
		adapter: plugin.app.vault.adapter,
		statesOf: (widget: string) => plugin.registry.get(widget)?.states,
	};
	return Promise.all(
		screens.map(async (screen) => ({
			name: screen.name,
			states: await Promise.all(
				statesOf(screen).map(async (state) => ({
					...(await readDrawnState(source, app, state, screen.name)),
					situation: state.situation,
				})),
			),
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

function refusedDesign(app: string, refusal: string): DrawnDesign {
	return {
		screens: [{ name: app, states: [{ name: app, board: null, refusal }] }],
		references: [],
		widgets: [],
	};
}

function textIn(state: unknown, key: string): string {
	const value = isObject(state) ? state[key] : undefined;
	return typeof value === "string" ? value : "";
}

function refreshHeader(leaf: unknown): void {
	if (isObject(leaf) && typeof leaf["updateHeader"] === "function") Reflect.apply(leaf["updateHeader"], leaf, []);
}
