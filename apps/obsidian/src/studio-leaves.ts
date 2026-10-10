import type { App, TFile, ViewState, WorkspaceLeaf } from "obsidian";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { STUDIO_PACKS } from "widgetarium/studio";
import type WidgetariumPlugin from "./main.js";
import type { AppProjects } from "./app-projects.js";
import { bindNote } from "./host.js";
import { studioNoteOfFile } from "./studio-drawing.js";
import type { StudioPlace } from "./studio-drawing.js";
import { STUDIO_VIEW_TYPE, StudioView } from "./studio-view.js";

interface MarkdownChoices {
	choose(leaf: WorkspaceLeaf, path: string): void;
	forgetUnlessShowing(leaf: WorkspaceLeaf, path: string): void;
	isChosen(leaf: WorkspaceLeaf, path: string): boolean;
}

interface LeafSwitcher {
	switchAll(): void;
	switchShowing(file: TFile): void;
}

const MARKDOWN_VIEW_TYPE = "markdown";
const AS_MARKDOWN = "asMarkdown";

export function registerStudioView(plugin: WidgetariumPlugin, projects: AppProjects, assistant: AssistantPort): void {
	registerPacks(...STUDIO_PACKS);
	const choices = createMarkdownChoices();
	const place: StudioPlace = {
		app: plugin.app,
		projects,
		viewType: STUDIO_VIEW_TYPE,
		assistant,
		catalogue: plugin.cataloguePort,
		hostOf: (notePath) => bindNote(plugin.host, notePath),
		openAsMarkdown: (leaf, file) => {
			choices.choose(leaf, file.path);
			return leaf.setViewState(markdownStateOf(leaf, { file: file.path, [AS_MARKDOWN]: true }));
		},
		showAsMarkdown: (leaf, file) => leaf.setViewState(markdownStateOf(leaf, { file: file.path })),
	};
	plugin.registerView(STUDIO_VIEW_TYPE, (leaf) => new StudioView(leaf, place));
	switchAppNotesToStudio(plugin, createLeafSwitcher(plugin.app, choices));
}

function markdownStateOf(leaf: WorkspaceLeaf, state: Record<string, unknown>): ViewState {
	return { ...leaf.getViewState(), type: MARKDOWN_VIEW_TYPE, state };
}

function switchAppNotesToStudio(plugin: WidgetariumPlugin, switcher: LeafSwitcher): void {
	const { workspace, metadataCache } = plugin.app;
	if (typeof workspace?.on !== "function" || typeof metadataCache?.on !== "function") return;
	const switchAll = (): void => switcher.switchAll();
	plugin.registerEvent(workspace.on("file-open", switchAll));
	plugin.registerEvent(workspace.on("layout-change", switchAll));
	plugin.registerEvent(workspace.on("active-leaf-change", switchAll));
	plugin.registerEvent(metadataCache.on("changed", (file) => switcher.switchShowing(file)));
	workspace.onLayoutReady(switchAll);
}

function createLeafSwitcher(app: App, choices: MarkdownChoices): LeafSwitcher {
	const switching = new Set<WorkspaceLeaf>();
	const switchLeaf = (leaf: WorkspaceLeaf): void => {
		const file = fileIn(leaf);
		if (!file || switching.has(leaf)) return;
		choices.forgetUnlessShowing(leaf, file.path);
		if (studioNoteOfFile(app, file) === null || choices.isChosen(leaf, file.path)) return;
		switching.add(leaf);
		void switchToStudio(leaf, file).finally(() => switching.delete(leaf));
	};
	const markdownLeaves = (): WorkspaceLeaf[] => app.workspace.getLeavesOfType(MARKDOWN_VIEW_TYPE);
	return {
		switchAll: () => markdownLeaves().forEach(switchLeaf),
		switchShowing: (file) =>
			markdownLeaves()
				.filter((leaf) => fileIn(leaf)?.path === file.path)
				.forEach(switchLeaf),
	};
}

function fileIn(leaf: WorkspaceLeaf): TFile | null {
	const file: unknown = Reflect.get(leaf.view, "file");
	return isNoteFile(file) ? file : null;
}

function isNoteFile(held: unknown): held is TFile {
	return typeof held === "object" && held !== null && typeof Reflect.get(held, "path") === "string";
}

async function switchToStudio(leaf: WorkspaceLeaf, file: TFile): Promise<void> {
	console.info(`[widgetarium] ${file.path}: markdown → studio view`);
	await leaf.setViewState({ ...leaf.getViewState(), type: STUDIO_VIEW_TYPE, state: { file: file.path } });
}

function createMarkdownChoices(): MarkdownChoices {
	const chosen = new WeakMap<WorkspaceLeaf, string>();
	return {
		choose: (leaf, path) => chosen.set(leaf, path),
		forgetUnlessShowing: (leaf, path) => {
			if (chosen.has(leaf) && chosen.get(leaf) !== path) chosen.delete(leaf);
		},
		isChosen: (leaf, path) => chosen.get(leaf) === path || isChosenInViewState(leaf, path),
	};
}

function isChosenInViewState(leaf: WorkspaceLeaf, path: string): boolean {
	const { state } = leaf.getViewState();
	return state?.["file"] === path && state[AS_MARKDOWN] === true;
}
