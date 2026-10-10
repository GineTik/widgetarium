import type { App, TFile, WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import type { ReactElement } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { CataloguePort } from "@widgetarium/core/engine/catalogue-port.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { hostOverRouter } from "widgetarium/app";
import { WidgetariumStudio, createStudioState, startOpenedStudio } from "widgetarium/studio";
import type { StartedStudio, StudioDesign, StudioState } from "widgetarium/studio";
import type { AppOpening, AppProjects } from "./app-projects.js";
import { refusalOf, reportNotDrawn, reportRefused } from "./app-refusal.js";
import { obsidianStudioHost } from "./studio-host-obsidian.js";
import { APP_KEY, studioNoteOf } from "./studio-note.js";
import type { StudioNote } from "./studio-note.js";
import type { StudioRouting } from "./studio-routing.js";

export interface StudioPlace {
	readonly app: App;
	readonly projects: AppProjects;
	readonly viewType: string;
	readonly assistant: AssistantPort;
	readonly catalogue: CataloguePort;
	hostOf(notePath: string): SurfaceHost;
	designFor(app: string, leaf: WorkspaceLeaf): Promise<StudioDesign | undefined>;
	openAsMarkdown(leaf: WorkspaceLeaf, file: TFile): Promise<void>;
	showAsMarkdown(leaf: WorkspaceLeaf, file: TFile): Promise<void>;
}

export interface ShownNote {
	readonly file: TFile;
	readonly note: StudioNote | null;
	readonly node: HTMLElement;
	readonly leaf: WorkspaceLeaf;
	readonly frame: HTMLElement;
}

interface StudioDrawing {
	readonly place: StudioPlace;
	readonly shown: ShownNote;
	readonly note: StudioNote;
	readonly studio: StudioHostPort;
	readonly state: StudioState;
	readonly routing: StudioRouting;
}

type OpenedApp = Extract<AppOpening, { readonly ok: true }>;

const NAMES_NO_APP = `This note opens in the studio, but its front matter names no app. Add "${APP_KEY}: <project folder>" to it.`;

export function studioNoteOfFile(app: App, file: TFile): StudioNote | null {
	return studioNoteOf(app.metadataCache.getFileCache(file)?.frontmatter);
}

export function drawStudio(place: StudioPlace, shown: ShownNote, routing: StudioRouting): () => void {
	const { note } = shown;
	if (!note) {
		render(refusalOf(NAMES_NO_APP), shown.node);
		return () => undefined;
	}
	const studio = obsidianStudioHost({ app: place.app, leaf: shown.leaf, frame: shown.frame, viewType: place.viewType });
	return redrawOnEveryChange({ place, shown, note, studio, state: createStudioState(), routing });
}

function redrawOnEveryChange(drawing: StudioDrawing): () => void {
	let latest = 0;
	const draw = (): void => {
		const asked = (latest += 1);
		void drawOpening(drawing, () => latest === asked);
	};
	const stopWatching = drawing.place.projects.watch(drawing.note.folder, draw);
	draw();
	return () => {
		latest = -1;
		stopWatching();
	};
}

async function drawOpening(drawing: StudioDrawing, isCurrent: () => boolean): Promise<void> {
	const { folder } = drawing.note;
	try {
		const opening = await drawing.place.projects.open(folder);
		const design = opening.ok ? await drawing.place.designFor(opening.app.name, drawing.shown.leaf) : undefined;
		if (isCurrent()) render(openingElementOf(drawing, opening, design), drawing.shown.node);
	} catch (failure) {
		const said = reportNotDrawn(folder, failure);
		if (isCurrent()) render(refusalOf(said), drawing.shown.node);
	}
}

function openingElementOf(drawing: StudioDrawing, opening: AppOpening, design: StudioDesign | undefined): ReactElement {
	if (!opening.ok) return refusalOf(reportRefused(drawing.note.folder, opening.findings));
	return h(WidgetariumStudio, { key: opening.version, started: startStudioOver(drawing, opening, design) });
}

function startStudioOver(drawing: StudioDrawing, opening: OpenedApp, design: StudioDesign | undefined): StartedStudio {
	const { place, shown, note, studio, state } = drawing;
	const notePath = shown.file.path;
	const router = drawing.routing.routerFor(note, opening.routes);
	const hostOf = hostOverRouter(() => place.hostOf(notePath), router);
	return startOpenedStudio(
		{ app: opening.app, routes: opening.routes, registry: opening.registry },
		{
			router,
			hostOf,
			studio,
			state,
			assistant: place.assistant,
			catalogue: place.catalogue,
			appId: note.folder,
			...(design ? { design } : {}),
		},
	);
}
