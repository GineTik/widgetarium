import { Notice } from "obsidian";
import { createShapeStore } from "@widgetarium/kit/shapes";
import { createWantedWidgets } from "@widgetarium/core/engine/widgets-wanted.js";
import { measure, traceSub } from "@widgetarium/core/trace.js";
import { createHeaderActions } from "./header-actions.js";
import { bindNote } from "./host.js";
import { substituteIn } from "./inline-render.js";
import { AI_VIEW_TYPE, AssistantView } from "./ai/view.js";
import { WidgetariumSettingTab } from "./ai/settings-tab.js";
import { createAssistant } from "./ai/assistant.js";

const EDIT_TITLE = { on: "Leave Widgetarium edit mode", off: "Edit the Widgetarium board" };
const WIDGETS_FETCHED = "Widgetarium: fetched {widgets}";

export function headerActionsOf(plugin) {
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

export function shapeStoreFollowingRenames(plugin) {
	const shapes = createShapeStore({
		read: () => plugin.shapeAnswers,
		write: (next) => {
			plugin.shapeAnswers = next;
			void plugin.saveShapes(next);
		},
	});
	if (typeof plugin.app.vault?.on !== "function") return shapes;
	plugin.registerEvent(
		plugin.app.vault.on("rename", (file, was) => {
			if (!file?.children) return;
			plugin.shapes.follow(was, file.path);
		}),
	);
	return shapes;
}

export function registerRenderersBeforeFirstNote(plugin) {
	plugin.registerMarkdownCodeBlockProcessor("widgetarium", (source, element, context) =>
		plugin.renderBlock(source, element, context),
	);
	plugin.registerMarkdownPostProcessor((element, context) =>
		measure("substitutions in a rendered section", () =>
			substituteIn({
				element,
				context,
				rules: plugin.rules,
				registry: plugin.registry,
				app: plugin.app,
				host: bindNote(plugin.host, context.sourcePath),
			}),
		),
	);
	traceSub("post-processor registered", { rules: plugin.rules.length });
}

export function wantedWidgetsOf(plugin) {
	return createWantedWidgets({
		isHeld: (id) => Boolean(plugin.registry.get(id)),
		installOne: async (id) => plugin.installer.installAt(id, await plugin.offers()),
		reread: () => plugin.rereadWidgets(),
		onInstalled: (ids) => new Notice(WIDGETS_FETCHED.replace("{widgets}", ids.join(", "))),
	});
}

export function startAssistant(plugin) {
	plugin.assistant = createAssistant(plugin.app, plugin);
	plugin.registerView(AI_VIEW_TYPE, (leaf) => new AssistantView(leaf, plugin.assistant));
	plugin.addSettingTab(new WidgetariumSettingTab(plugin.app, plugin));
	plugin.assistant
		.layAgentFiles()
		.catch((failure) => console.error("[widgetarium] the agent handbook was not written", failure));
	plugin.assistant
		.restore()
		.catch((failure) => console.error("[widgetarium] the last conversation could not be read back", failure));
	plugin.app.workspace.onLayoutReady(() => plugin.showAssistant(false));
	plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", () => plugin.redrawAssistant()));
}
