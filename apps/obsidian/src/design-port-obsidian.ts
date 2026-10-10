import { Notice, TFile } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { designFolderOf, designPathOf, readDesign, referencePathOf, statesOf } from "@widgetarium/core/app-design.js";
import type { Design } from "@widgetarium/core/app-design.js";
import { appWidgetsOf } from "@widgetarium/core/app-widgets.js";
import { specPathOf } from "@widgetarium/core/app-spec.js";
import { refusedDesignOf } from "@widgetarium/core/engine/design-port.js";
import type { DesignPort, DrawnDesign, LayerMove } from "@widgetarium/core/engine/design-port.js";
import { movedNode } from "@widgetarium/core/engine/node-moves.js";
import { addPhotos } from "@widgetarium/studio";
import type { StudioDesign } from "@widgetarium/studio";
import { noteToReturnTo, readAppSpec } from "./app-of-note.js";
import { blockIdOf, blocksOf, withBlocks } from "./design-block-registry.js";
import { docsOf } from "./design-docs-read.js";
import { readDrawnState } from "./design-drawn-state.js";
import { catalogueInstallsOf, specWidgetsOf } from "./design-spec-widgets.js";
import type WidgetariumPlugin from "./main.js";
import { canvasOf } from "./off-screen.js";

export interface DesignPlace {
	readonly leafOf: () => WorkspaceLeaf;
	readonly fromNote: () => string;
}

const DESIGN_POLL_MS = 1500;
const JOBS_REDRAW_MS = 400;
const DRAFT_PREFIX = "@draft/";
const NO_DESIGN_YET = "{app} has no design yet, or it was removed.";
const PHOTOS_FAILED = "The photos were not added to the canvas: {why}";
const NO_PAGE_FOLDER = "{widget} has no folder in this vault, so its layout cannot be changed here.";
const NOT_MOVED = "Nothing was moved: {why}";
const NO_NOTE_TO_RETURN_TO = "{app} has no page with a note to go back to.";
const SPEC_REFUSED = "The spec of {app} cannot be read: {why}";

export function obsidianDesignPort(plugin: WidgetariumPlugin, place: DesignPlace): DesignPort {
	const drawnOn = new Map<string, DrawnDesign>();
	const jobs = () => plugin.assistant?.jobs;
	return {
		design: async (app, isStarting) => {
			const design = await designOf(plugin, app, isStarting);
			drawnOn.set(app, design);
			return design;
		},
		docs: (app) => docsOf(plugin, app),
		jobs: (app) => jobs()?.jobsOf(app) ?? [],
		onJobs: (changed) => watchedJobs(plugin, changed),
		liveJob: (app, id) => jobs()?.liveOf(app, id) ?? null,
		stopJob: async (app, id) => jobs()?.stop(app, id),
		drawing: () => ({ registry: withBlocks(plugin.registry), host: plugin.host }),
		onChanged: (app, changed) => polledChanges(plugin, app, () => drawnOn.get(app), changed),
		addPhotos: (app, photos) => photosAdded(plugin, app, photos),
		moveLayer: (widget, move) => layerMoved(plugin, widget, move),
		returnToView: (app, page) => returnedToAppNote(plugin, place, app, page),
		pictureOf: canvasOf,
	};
}

export async function studioDesignOf(
	plugin: WidgetariumPlugin,
	app: string,
	leaf: WorkspaceLeaf,
): Promise<StudioDesign | undefined> {
	if (!(await plugin.app.vault.adapter.exists(designFolderOf(app)))) return undefined;
	return { port: obsidianDesignPort(plugin, { leafOf: () => leaf, fromNote: () => "" }), app };
}

export async function designOf(plugin: WidgetariumPlugin, app: string, isStarting = false): Promise<DrawnDesign> {
	const text = await plugin.app.vault.adapter.read(designPathOf(app)).catch(() => null);
	if (text === null && isStarting) return { screens: [], references: [], widgets: [] };
	if (text === null) return refusedDesignOf(app, NO_DESIGN_YET.replace("{app}", app));
	const read = readDesign(text);
	if (read.refusal !== undefined) return refusedDesignOf(app, read.refusal);
	const screens = await drawnScreensOf(plugin, app, read.design.screens);
	const references = drawnReferencesOf(plugin, app, read.design.references);
	return { screens, references, widgets: await widgetsOf(plugin, app, screens) };
}

function watchedJobs(plugin: WidgetariumPlugin, changed: () => void): () => void {
	let soon: number | null = null;
	const stop = plugin.assistant?.jobs.watch(() => {
		if (soon !== null) return;
		soon = window.setTimeout(() => {
			soon = null;
			changed();
		}, JOBS_REDRAW_MS);
	});
	return () => {
		if (soon !== null) window.clearTimeout(soon);
		stop?.();
	};
}

function polledChanges(
	plugin: WidgetariumPlugin,
	app: string,
	drawn: () => DrawnDesign | undefined,
	changed: () => void,
): () => void {
	let seen = "";
	const poll = async (): Promise<void> => {
		const now = await changeStampOf(plugin, app, drawn());
		if (seen !== "" && now !== seen) changed();
		seen = now;
	};
	const timer = window.setInterval(() => void poll(), DESIGN_POLL_MS);
	return () => window.clearInterval(timer);
}

async function changeStampOf(plugin: WidgetariumPlugin, app: string, drawn: DrawnDesign | undefined): Promise<string> {
	const adapter = plugin.app.vault.adapter;
	const stats = await Promise.all(
		[designPathOf(app), specPathOf(app)].map((path) => adapter.stat(path).catch(() => null)),
	);
	const screens = drawn?.screens ?? [];
	const blocksNow = draftsOn(screens)
		.map((draft) => blocksOf(plugin.registry, draft).join(","))
		.join(";");
	const buildsNow = widgetsDrawnOn(plugin, screens, drawn?.widgets ?? [])
		.map((id) => plugin.registry.get(id)?.buildKey ?? "")
		.join(",");
	return [...stats.map((stat) => String(stat?.mtime ?? "")), blocksNow, buildsNow].join("|");
}

async function photosAdded(plugin: WidgetariumPlugin, app: string, photos: readonly File[]): Promise<void> {
	try {
		await addPhotos(plugin.app.vault.adapter, app, photos);
	} catch (failure) {
		console.error("[widgetarium] design photos were not added", failure);
		new Notice(PHOTOS_FAILED.replace("{why}", failure instanceof Error ? failure.message : String(failure)));
	}
}

async function layerMoved(plugin: WidgetariumPlugin, widget: string, move: LayerMove): Promise<void> {
	const folder = plugin.registry.get(widget)?.folder;
	if (!folder) return void new Notice(NO_PAGE_FOLDER.replace("{widget}", widget));
	const path = `${folder}/${move.file}`;
	const adapter = plugin.app.vault.adapter;
	const moved = movedNode(await adapter.read(path), move);
	if ("refusal" in moved) return void new Notice(NOT_MOVED.replace("{why}", moved.refusal));
	await adapter.write(path, moved.source);
}

async function returnedToAppNote(
	plugin: WidgetariumPlugin,
	place: DesignPlace,
	app: string,
	page: string,
): Promise<void> {
	const read = await readAppSpec(plugin.app.vault.adapter, app);
	if (read?.refusal !== undefined) {
		console.error("[widgetarium] the canvas cannot return to the app", read.refusal);
		return void new Notice(SPEC_REFUSED.replace("{app}", app).replace("{why}", read.refusal));
	}
	const note = noteToReturnTo(read?.spec.pages ?? [], page, place.fromNote());
	const file = note && plugin.app.vault.getAbstractFileByPath(note);
	if (!(file instanceof TFile)) return void new Notice(NO_NOTE_TO_RETURN_TO.replace("{app}", app));
	await place.leafOf().openFile(file, { active: true });
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
