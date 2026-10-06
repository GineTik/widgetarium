import { ItemView, Notice, parseYaml } from "obsidian";
import type { App, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { findBlocks } from "@widgetarium/core/block-writer.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";
import {
	designPathOf,
	readDesign,
	referencePathOf,
	screenPathOf,
	statesOf,
	vaultBindingOf,
} from "@widgetarium/core/app-design.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { appWidgetsOf } from "@widgetarium/core/app-widgets.js";
import { readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import { LOCK_PATH } from "@widgetarium/core/paths.js";
import { DesignCanvas } from "./design-canvas.js";
import { blockIdOf, blocksOf, withBlocks } from "./design-block-registry.js";
import type { DrawnDesign, DrawnState } from "./design-canvas-shapes.js";
import { addPhotos, imageFilesIn } from "./design-photos.js";
import type WidgetariumPlugin from "./main.js";

export const DESIGN_VIEW_TYPE = "widgetarium-design";

const TITLE = "Design · {app}";
const NO_BOARD = "{name} holds no widgetarium board";
const BOUND_TO_VAULT =
	"{name} reads the vault ({binding}): a design is drawn from sample rows only. Ask the agent to redraw it.";
const DESIGN_POLL_MS = 1500;
const DRAFT_PREFIX = "@draft/";
const NO_DESIGN = "{app} has no design yet, or it was removed.";
const PHOTOS_FAILED = "The photos were not added to the canvas: {why}";

export class DesignView extends ItemView {
	private appName = "";
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
		return { app: this.appName };
	}

	override async setState(state: unknown, result: ViewStateResult): Promise<void> {
		this.appName = isObject(state) && typeof state["app"] === "string" ? state["app"] : "";
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
		await this.draw();
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
		const now = [...stats.map((stat) => String(stat?.mtime ?? "")), blocksNow].join("|");
		if (this.seen !== "" && now !== this.seen) await this.draw();
		this.seen = now;
	}

	private drawnDrafts: string[] = [];

	override async onClose(): Promise<void> {
		if (this.node) render(null, this.node);
		this.node = null;
	}

	private async draw(): Promise<void> {
		const node = this.node;
		const size = { width: this.contentEl.clientWidth, height: this.contentEl.clientHeight };
		if (!node || !this.appName || size.width === 0 || size.height === 0) return;
		const { screens, references, widgets } = await designOf(this.plugin, this.appName);
		this.drawnDrafts = draftsOn(screens);
		const onAddPhotos = (photos: readonly File[]): void => void this.addPhotos(photos);
		const drawing = { registry: withBlocks(this.plugin.registry), host: this.plugin.host };
		render(h(DesignCanvas, { app: this.appName, screens, references, widgets, size, onAddPhotos, ...drawing }), node);
	}
}

export function registerDesignView(plugin: WidgetariumPlugin): void {
	plugin.registerView(DESIGN_VIEW_TYPE, (leaf) => new DesignView(leaf, plugin));
}

export async function openDesign(obsidian: App, app: string): Promise<void> {
	const open = obsidian.workspace.getLeavesOfType(DESIGN_VIEW_TYPE).find((held) => held.view.getState()["app"] === app);
	const leaf = open ?? obsidian.workspace.getLeaf("tab");
	await leaf.setViewState({ type: DESIGN_VIEW_TYPE, active: true, state: { app } });
	await obsidian.workspace.revealLeaf(leaf);
}

function refreshHeader(leaf: unknown): void {
	if (isObject(leaf) && typeof leaf["updateHeader"] === "function") Reflect.apply(leaf["updateHeader"], leaf, []);
}

async function designOf(plugin: WidgetariumPlugin, app: string): Promise<DrawnDesign> {
	const adapter = plugin.app.vault.adapter;
	const text = await adapter.read(designPathOf(app)).catch(() => null);
	if (text === null) return refusedDesign(app, NO_DESIGN.replace("{app}", app));
	const read = readDesign(text);
	if (read.refusal !== undefined) return refusedDesign(app, read.refusal);
	const screens = await Promise.all(
		read.design.screens.map(async (screen) => ({
			name: screen.name,
			states: await Promise.all(statesOf(screen).map((state) => stateOf(plugin, app, state))),
		})),
	);
	const references = read.design.references.map((reference) => ({
		name: "url" in reference ? reference.url : reference.file,
		src: "url" in reference ? reference.url : adapter.getResourcePath(referencePathOf(app, reference.file)),
		why: reference.why,
	}));
	return { screens, references, widgets: await widgetsOf(plugin, app, screens) };
}

async function widgetsOf(
	plugin: WidgetariumPlugin,
	app: string,
	screens: DrawnDesign["screens"],
): Promise<DrawnDesign["widgets"]> {
	const onScreens = widgetsOnScreens(screens).flatMap((id) => {
		const uses = plugin.registry.get(id)?.uses ?? [];
		return uses.length > 0 ? uses : [id];
	});
	const used = appWidgetsOf([...(await specWidgetsOf(plugin, app)), ...onScreens], await catalogueInstallsOf(plugin));
	const exists = (id: string): boolean => Boolean(plugin.registry.get(id)?.component);
	const blocks = draftsOn(screens).flatMap((draft) =>
		blocksOf(plugin.registry, draft).map((block) => blockIdOf(draft, block)),
	);
	return { fromCatalogue: used.fromCatalogue.filter(exists), made: [...blocks, ...used.made.filter(exists)] };
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
		widgets: { fromCatalogue: [], made: [] },
	};
}

async function stateOf(
	plugin: WidgetariumPlugin,
	app: string,
	state: { name: string; file: string },
): Promise<DrawnState> {
	const text = await plugin.app.vault.adapter.read(screenPathOf(app, state.file)).catch(() => "");
	const board = boardIn(text);
	if (!board) return { name: state.name, board, refusal: NO_BOARD.replace("{name}", state.file) };
	const binding = vaultBindingOf(board);
	if (binding)
		return {
			name: state.name,
			board: null,
			refusal: BOUND_TO_VAULT.replace("{name}", state.file).replace("{binding}", binding),
		};
	return { name: state.name, board };
}

function boardIn(text: string): Board | null {
	const lines = text.split("\n");
	const [block] = findBlocks(lines);
	if (!block) return null;
	try {
		return normalizeBoard(parseYaml(lines.slice(block.start + 1, block.end).join("\n")));
	} catch {
		return null;
	}
}
