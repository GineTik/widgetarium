import { Notice } from "obsidian";
import type { MarkdownPostProcessorContext, TAbstractFile } from "obsidian";
import { createShapeStore, shapesOf } from "@widgetarium/kit/shapes";
import type { ShapeStore } from "@widgetarium/kit/shapes";
import { createWantedWidgets } from "@widgetarium/core/engine/widgets-wanted.js";
import { WidgetRegistry } from "@widgetarium/core/registry.js";
import { measure, trace, traceSub } from "@widgetarium/core/trace.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { gitPack } from "@widgetarium/pack-git";
import { REACT_SURFACE_SOURCE } from "widgetarium:surface";
import { createHeaderActions } from "./header-actions.js";
import type { HeaderActions } from "./header-actions.js";
import { bindNote, createHost } from "./host.js";
import { substituteIn } from "./inline-render.js";
import { AI_VIEW_TYPE, AssistantView } from "./ai/view.js";
import { WidgetariumSettingTab } from "./ai/settings-tab.js";
import { createAssistant } from "./ai/assistant.js";
import { addCommandsAndRibbon } from "./plugin-commands.js";
import { pluginInstaller } from "./widget-offers.js";
import { activeRules, normalizeRules, ruleBlock } from "./substitution.js";
import { ensureFolders, watchWidgets } from "./widget-upkeep.js";
import type WidgetariumPlugin from "./main.js";
import type { WantedWidgets } from "./main.js";

const EDIT_TITLE = { on: "Leave Widgetarium edit mode", off: "Edit the Widgetarium board" };
const WIDGETS_FETCHED = "Widgetarium: fetched {widgets}";
const AFTER_FIRST_DRAW_MS = 3000;

export function startPlugin(plugin: WidgetariumPlugin): void {
	const startedAt = performance.now();
	registerPacks(gitPack);
	plugin.editing = false;
	plugin.mounts = new Map();
	plugin.header = headerActionsOf(plugin);
	plugin.registerEvent(plugin.app.workspace.on("layout-change", () => plugin.header.sync()));
	plugin.registry = new WidgetRegistry(plugin.app, REACT_SURFACE_SOURCE);
	plugin.shapeAnswers = {};
	plugin.shapes = shapeStoreFollowingRenames(plugin);
	plugin.host = createHost(plugin.app, plugin);
	plugin.rules = [];
	registerRenderersBeforeFirstNote(plugin);
	plugin.installer = pluginInstaller(plugin);
	plugin.wanted = wantedWidgetsOf(plugin);
	plugin.started = plugin
		.startUp()
		.catch((failure: unknown) => console.error("[widgetarium] the widgets could not be read", failure));
	startAssistant(plugin);
	addCommandsAndRibbon(plugin);
	trace("onload done", { ms: Math.round(performance.now() - startedAt) });
}

export async function startUp(plugin: WidgetariumPlugin): Promise<void> {
	await measure("onload · ensureFolders", () => ensureFolders(plugin));
	const [, stored] = await Promise.all([
		measure("onload · registry.load", () => plugin.registry.load()),
		measure("onload · loadData", (): Promise<unknown> => plugin.loadData()),
	]);
	const held = isStored(stored) ? stored : {};
	plugin.shapeAnswers = shapesOf(held["shapes"]);
	plugin.rules = normalizeRules(held["substitutions"]);
	traceSub("rules loaded", () => ({
		rules: plugin.rules.length,
		live: activeRules(plugin.rules).length,
		blocked: plugin.rules.filter(ruleBlock).map((rule) => `${rule.id} (${String(ruleBlock(rule))})`),
		widgets: plugin.rules.map((rule) => rule.widget),
	}));
	measure("onload · rerenderNotes", () => plugin.rerenderNotesSoSubstitutionsApply());
	// TRADE-OFF: a fixed wait, not "after every board drew" — a board may never be opened, and each disk question asked while boards draw queues behind theirs
	plugin.afterFirstDraw = window.setTimeout(
		() =>
			watchWidgets(plugin).catch((failure: unknown) =>
				console.error("[widgetarium] the widget folders are not watched", failure),
			),
		AFTER_FIRST_DRAW_MS,
	);
}

function isStored(stored: unknown): stored is Readonly<Record<string, unknown>> {
	return typeof stored === "object" && stored !== null;
}

function headerActionsOf(plugin: WidgetariumPlugin): HeaderActions {
	return createHeaderActions({
		app: plugin.app,
		mounts: () => plugin.mounts.values(),
		editAction: () => ({
			key: "edit",
			icon: "pencil",
			title: plugin.editing ? EDIT_TITLE.on : EDIT_TITLE.off,
			isOn: plugin.editing,
			press: () => plugin.toggleEditing(),
		}),
	});
}

function shapeStoreFollowingRenames(plugin: WidgetariumPlugin): ShapeStore {
	const shapes = createShapeStore({
		read: () => plugin.shapeAnswers,
		write: (next) => {
			plugin.shapeAnswers = next;
			void plugin.saveShapes(next);
		},
	});
	if (typeof plugin.app.vault?.on !== "function") return shapes;
	plugin.registerEvent(
		plugin.app.vault.on("rename", (file: TAbstractFile, was: string) => {
			if (!("children" in file)) return;
			plugin.shapes.follow(was, file.path);
		}),
	);
	return shapes;
}

function registerRenderersBeforeFirstNote(plugin: WidgetariumPlugin): void {
	plugin.registerMarkdownCodeBlockProcessor("widgetarium", (source, element, context) =>
		plugin.renderBlock(source, element, context),
	);
	const substituteSection: (element: HTMLElement, context: MarkdownPostProcessorContext) => void = (element, context) =>
		measure("substitutions in a rendered section", () =>
			substituteIn({
				element,
				context,
				rules: plugin.rules,
				registry: plugin.registry,
				app: plugin.app,
				host: bindNote(plugin.host, context.sourcePath),
			}),
		);
	plugin.registerMarkdownPostProcessor(substituteSection);
	traceSub("post-processor registered", { rules: plugin.rules.length });
}

function wantedWidgetsOf(plugin: WidgetariumPlugin): WantedWidgets {
	return createWantedWidgets({
		isHeld: (id) => Boolean(plugin.registry.get(id)),
		installOne: async (id) => plugin.installer.installAt(id, await plugin.offers()),
		reread: () => plugin.rereadWidgets(),
		onInstalled: (ids) => new Notice(WIDGETS_FETCHED.replace("{widgets}", ids.join(", "))),
	});
}

function startAssistant(plugin: WidgetariumPlugin): void {
	const assistant = createAssistant(plugin.app, plugin);
	plugin.assistant = assistant;
	plugin.registerView(AI_VIEW_TYPE, (leaf) => new AssistantView(leaf, assistant));
	plugin.addSettingTab(new WidgetariumSettingTab(plugin.app, plugin));
	assistant
		.layAgentFiles()
		.catch((failure: unknown) => console.error("[widgetarium] the agent handbook was not written", failure));
	assistant
		.restore()
		.catch((failure: unknown) => console.error("[widgetarium] the last conversation could not be read back", failure));
	plugin.app.workspace.onLayoutReady(() => void plugin.showAssistant(false));
	plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", () => plugin.redrawAssistant()));
}
