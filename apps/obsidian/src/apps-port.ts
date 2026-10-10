import { DESIGN_FOLDER, designPathOf } from "@widgetarium/core/app-design.js";
import { SPEC_FOLDER } from "@widgetarium/core/app-spec.js";
import type { AppsPort, HostApp } from "@widgetarium/core/engine/apps-port.js";
import { AI_VIEW_TYPE } from "./ai/view.js";
import { readAppSpec } from "./app-of-note.js";
import { openDesign } from "./design-view.js";
import type WidgetariumPlugin from "./main.js";

const NEW_APP_NAME = "Untitled app";
const NUMBERED_NAME = "{name} {number}";
const EMPTY_CANVAS = `${JSON.stringify({ screens: [], references: [] }, null, 2)}\n`;

export function createAppsPort(plugin: WidgetariumPlugin): AppsPort {
	const changes = new Set<() => void>();
	const announce = (): void => changes.forEach((changed) => changed());
	return {
		can: true,
		list: () => appsIn(plugin),
		open: (id) => openApp(plugin, id),
		create: async () => {
			await createApp(plugin);
			announce();
		},
		editInCanvas: (id) => openDesign(plugin.app, id),
		toggleAssistant: () => toggleAssistant(plugin),
		subscribe: (changed) => {
			changes.add(changed);
			return () => changes.delete(changed);
		},
	};
}

async function appsIn(plugin: WidgetariumPlugin): Promise<readonly HostApp[]> {
	const { adapter } = plugin.app.vault;
	if (!(await adapter.exists(SPEC_FOLDER))) return [];
	const { folders } = await adapter.list(SPEC_FOLDER);
	const names = folders.map((folder) => folder.slice(folder.lastIndexOf("/") + 1)).sort();
	return Promise.all(names.map(async (name) => hostAppOf(name, (await readAppSpec(adapter, name))?.spec?.pages ?? [])));
}

function hostAppOf(name: string, pages: readonly { readonly name: string }[]): HostApp {
	return { id: name, name, pages: pages.length, firstPage: pages[0]?.name ?? null };
}

async function openApp(plugin: WidgetariumPlugin, id: string): Promise<void> {
	const note = (await readAppSpec(plugin.app.vault.adapter, id))?.spec?.pages.find((page) => page.note)?.note;
	if (!note) return openDesign(plugin.app, id);
	await plugin.app.workspace.openLinkText(note, "", false);
}

async function createApp(plugin: WidgetariumPlugin): Promise<void> {
	const taken = new Set((await appsIn(plugin)).map((app) => app.id));
	const name = freeNameOf(taken);
	const { adapter } = plugin.app.vault;
	await adapter.mkdir(`${SPEC_FOLDER}/${name}/${DESIGN_FOLDER}`);
	await adapter.write(designPathOf(name), EMPTY_CANVAS);
	await openDesign(plugin.app, name);
}

function freeNameOf(taken: ReadonlySet<string>): string {
	if (!taken.has(NEW_APP_NAME)) return NEW_APP_NAME;
	for (let number = 2; ; number += 1) {
		const name = NUMBERED_NAME.replace("{name}", NEW_APP_NAME).replace("{number}", String(number));
		if (!taken.has(name)) return name;
	}
}

async function toggleAssistant(plugin: WidgetariumPlugin): Promise<void> {
	const { rightSplit } = plugin.app.workspace;
	const isShown = plugin.app.workspace.getLeavesOfType(AI_VIEW_TYPE).some((leaf) => leaf.view.containerEl.isShown());
	if (isShown && !rightSplit.collapsed) return rightSplit.collapse();
	if (rightSplit.collapsed) rightSplit.expand();
	await plugin.showAssistant();
}
