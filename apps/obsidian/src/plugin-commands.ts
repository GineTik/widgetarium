import { Notice } from "obsidian";
import type { Command } from "obsidian";
import { measure } from "@widgetarium/core/trace.js";
import type WidgetariumPlugin from "./main.js";

interface PluginSwitch {
	disablePlugin(id: string): Promise<unknown>;
	enablePlugin(id: string): Promise<unknown>;
}

export function addCommandsAndRibbon(plugin: WidgetariumPlugin): void {
	plugin.addRibbonIcon("layout-grid", "Widgetarium: edit mode", () => plugin.toggleEditing());
	plugin.addRibbonIcon("replace", "Widgetarium: substitutions", () => void plugin.showSubstitutions());
	plugin.addRibbonIcon("sparkles", "Widgetarium: ask the assistant", () => void plugin.showAssistant());
	plugin.addRibbonIcon("library", "Widgetarium: widget catalogue", () => void plugin.showCatalogue());
	for (const command of [...assistantCommands(plugin), ...boardCommands(plugin), ...widgetCommands(plugin)])
		plugin.addCommand(command);
	plugin.registerEvent(plugin.app.workspace.on("file-menu", (menu, file) => plugin.offerBoardIn(menu, file)));
}

function assistantCommands(plugin: WidgetariumPlugin): Command[] {
	return [
		{ id: "open-assistant", name: "Open the assistant", callback: () => void plugin.showAssistant() },
		{
			id: "clear-assistant-context",
			name: "Clear the assistant's context",
			callback: () => {
				void plugin.assistant?.forgetContext();
				new Notice("Widgetarium: the assistant forgot this conversation");
			},
		},
		{ id: "configure-providers", name: "Configure AI providers", callback: () => plugin.assistant?.openProviders() },
	];
}

function boardCommands(plugin: WidgetariumPlugin): Command[] {
	return [
		{ id: "toggle-edit", name: "Toggle edit mode", callback: () => plugin.toggleEditing() },
		{ id: "create-board", name: "Create board", callback: () => void plugin.createBoard() },
		{
			id: "create-board-from-template",
			name: "Create board from template",
			callback: () => void plugin.showTemplates(),
		},
		{ id: "insert-board", name: "Insert board here", editorCallback: (editor) => plugin.insertBoard(editor) },
	];
}

function widgetCommands(plugin: WidgetariumPlugin): Command[] {
	return [
		{
			id: "reload-plugin",
			name: "Reload plugin",
			callback: async () => {
				const plugins = pluginSwitchOf(plugin);
				if (!plugins) return;
				await plugins.disablePlugin(plugin.manifest.id);
				await plugins.enablePlugin(plugin.manifest.id);
				new Notice("Widgetarium: plugin reloaded");
			},
		},
		{ id: "edit-substitutions", name: "Edit substitutions", callback: () => void plugin.showSubstitutions() },
		{ id: "open-catalogue", name: "Open widget catalogue", callback: () => void plugin.showCatalogue() },
		{ id: "open-docs", name: "Open docs", callback: () => void plugin.showDocs() },
		{
			id: "reload-widgets",
			name: "Reload widgets",
			callback: async () => {
				await measure("registry.load on demand", () => plugin.registry.load());
				plugin.refresh();
				new Notice(`Widgetarium: ${plugin.registry.list().length} widgets`);
			},
		},
	];
}

function pluginSwitchOf(plugin: WidgetariumPlugin): PluginSwitch | null {
	const plugins: unknown = Reflect.get(plugin.app, "plugins");
	return isPluginSwitch(plugins) ? plugins : null;
}

function isPluginSwitch(held: unknown): held is PluginSwitch {
	return (
		typeof held === "object" &&
		held !== null &&
		typeof Reflect.get(held, "disablePlugin") === "function" &&
		typeof Reflect.get(held, "enablePlugin") === "function"
	);
}
