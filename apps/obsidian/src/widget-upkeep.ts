import { Notice } from "obsidian";
import { WIDGETS_DIR, COMPONENTS_DIR } from "@widgetarium/core/paths.js";
import type { RebuiltDrifted } from "@widgetarium/core/installer-upkeep.js";
import { watchWidgetScopes } from "./widget-watch.js";
import type WidgetariumPlugin from "./main.js";

const WIDGET_POLL_MS = 1000;
const WIDGETS_NOT_REREAD = "Widgetarium: the changed widgets could not be read again — the console says why";

export async function ensureFolders(plugin: WidgetariumPlugin): Promise<void> {
	const adapter = plugin.app.vault.adapter;
	for (const folder of [WIDGETS_DIR, COMPONENTS_DIR]) {
		if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
	}
}

export async function watchWidgets(plugin: WidgetariumPlugin): Promise<void> {
	const unwatch = watchedScopes(plugin);
	if (unwatch) plugin.register(unwatch);
	else if (await isAuthoringWidgetsHere(plugin)) await watchWidgetFolder(plugin);
}

export function revalidateWidgets(plugin: WidgetariumPlugin): Promise<void> {
	return queueWidgetWork(plugin, () => revalidate(plugin));
}

export function widgetsChanged(plugin: WidgetariumPlugin): Promise<void> {
	return queueWidgetWork(plugin, () => reloadWidgets(plugin));
}

export async function widgetSignature(plugin: WidgetariumPlugin): Promise<string> {
	const adapter = plugin.app.vault.adapter;
	if (!(await adapter.exists(WIDGETS_DIR))) return "";

	const scopes = (await adapter.list(WIDGETS_DIR)).folders;
	const folders = (await Promise.all(scopes.map((scope) => adapter.list(scope)))).flatMap((held) => held.folders);
	const files = (await Promise.all(folders.map((folder) => adapter.list(folder)))).flatMap((held) => held.files);
	const stamped = await Promise.all(
		files.map(async (file) => {
			const stat = await adapter.stat(file);
			return `${file}:${stat?.mtime ?? 0}:${stat?.size ?? 0}`;
		}),
	);
	return stamped.join("|");
}

async function isAuthoringWidgetsHere(plugin: WidgetariumPlugin): Promise<boolean> {
	return (await plugin.installer.folderSourcePaths()).length > 0;
}

// TRADE-OFF: a poll, because a dot folder emits no vault event; only an author here pays it
async function watchWidgetFolder(plugin: WidgetariumPlugin): Promise<void> {
	plugin.signature = await widgetSignature(plugin);
	plugin.registerInterval(window.setInterval(() => void pollWidgets(plugin), WIDGET_POLL_MS));
}

async function pollWidgets(plugin: WidgetariumPlugin): Promise<void> {
	if (plugin.isPolling || plugin.mounts.size === 0) return;
	plugin.isPolling = true;
	try {
		const signature = await widgetSignature(plugin);
		if (signature !== plugin.signature) {
			plugin.signature = signature;
			await plugin.widgetsChanged();
		}
	} finally {
		plugin.isPolling = false;
	}
}

async function rebuildWidgets(plugin: WidgetariumPlugin): Promise<RebuiltDrifted> {
	const done = await plugin.installer.rebuildDrifted();
	if (done.rebuilt.length > 0) {
		await plugin.registry.load();
		plugin.refresh();
	}
	if (done.failures.length > 0)
		new Notice(`Widgetarium: ${done.failures.map((each) => each.id).join(", ")} did not build — the console says why`);
	return done;
}

function watchedScopes(plugin: WidgetariumPlugin): (() => void) | null {
	try {
		return watchWidgetScopes(plugin.app.vault.adapter, () => void plugin.widgetsChanged());
	} catch (failure) {
		console.error("[widgetarium] the widget folders cannot be watched, so they are polled instead", failure);
		return null;
	}
}

function queueWidgetWork(plugin: WidgetariumPlugin, work: () => Promise<void>): Promise<void> {
	plugin.widgetWork = (plugin.widgetWork ?? Promise.resolve()).then(work).catch((failure: unknown) => {
		console.error("[widgetarium] the widgets could not be read again", failure);
		new Notice(WIDGETS_NOT_REREAD);
	});
	return plugin.widgetWork;
}

async function reloadWidgets(plugin: WidgetariumPlugin): Promise<void> {
	await rebuildWidgets(plugin);
	await plugin.registry.load();
	plugin.refresh();
}

async function revalidate(plugin: WidgetariumPlugin): Promise<void> {
	const changed = await plugin.startupCache.filesChanged();
	if (changed?.length === 0 && plugin.startupCache.areBuildsChecked()) {
		console.info("[widgetarium] revalidate: unchanged");
		return;
	}
	console.info(`[widgetarium] revalidate: ${revalidationOf(changed)}`);
	const done = await rebuildWidgets(plugin);
	if (changed?.length !== 0 && done.rebuilt.length === 0) {
		await plugin.registry.load();
		plugin.refresh();
	}
	if (done.failures.length === 0) plugin.startupCache.markBuildsChecked();
}

function revalidationOf(changed: readonly string[] | null): string {
	if (changed === null) return "the vault cannot stat its files → reload";
	if (changed.length === 0) return "unchanged, builds not yet checked → build pass";
	return `${changed.length} files changed → reload`;
}
