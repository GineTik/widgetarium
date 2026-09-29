import { Notice } from "obsidian";
import { measure } from "@widgetarium/core/trace.js";

export function addCommandsAndRibbon(plugin) {
	plugin.addRibbonIcon("layout-grid", "Widgetarium: edit mode", () => plugin.toggleEditing());
	plugin.addRibbonIcon("replace", "Widgetarium: substitutions", () => plugin.showSubstitutions());
	plugin.addRibbonIcon("sparkles", "Widgetarium: ask the assistant", () => plugin.showAssistant());
	for (const command of [...assistantCommands(plugin), ...boardCommands(plugin), ...widgetCommands(plugin)])
		plugin.addCommand(command);
	plugin.registerEvent(plugin.app.workspace.on("file-menu", (menu, file) => plugin.offerBoardIn(menu, file)));
}

function assistantCommands(plugin) {
	return [
		{ id: "open-assistant", name: "Open the assistant", callback: () => plugin.showAssistant() },
		{
			id: "clear-assistant-context",
			name: "Clear the assistant's context",
			callback: () => {
				plugin.assistant.forgetContext();
				new Notice("Widgetarium: the assistant forgot this conversation");
			},
		},
		{ id: "configure-providers", name: "Configure AI providers", callback: () => plugin.assistant.openProviders() },
	];
}

function boardCommands(plugin) {
	return [
		{ id: "toggle-edit", name: "Toggle edit mode", callback: () => plugin.toggleEditing() },
		{ id: "create-board", name: "Create board", callback: () => plugin.createBoard() },
		{ id: "create-board-from-template", name: "Create board from template", callback: () => plugin.showTemplates() },
		{ id: "insert-board", name: "Insert board here", editorCallback: (editor) => plugin.insertBoard(editor) },
	];
}

function widgetCommands(plugin) {
	return [
		{
			id: "reload-plugin",
			name: "Reload plugin",
			callback: async () => {
				const plugins = plugin.app.plugins;
				await plugins.disablePlugin(plugin.manifest.id);
				await plugins.enablePlugin(plugin.manifest.id);
				new Notice("Widgetarium: plugin reloaded");
			},
		},
		{ id: "edit-substitutions", name: "Edit substitutions", callback: () => plugin.showSubstitutions() },
		{ id: "browse-widgets", name: "Browse widgets", callback: () => plugin.showCatalogue() },
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
