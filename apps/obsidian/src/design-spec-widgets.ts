import { boardIn } from "./board-in-note.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import { LOCK_PATH } from "@widgetarium/core/paths.js";
import type WidgetariumPlugin from "./main.js";

export async function specWidgetsOf(plugin: WidgetariumPlugin, app: string): Promise<string[]> {
	const text = await plugin.app.vault.adapter.read(specPathOf(app)).catch(() => null);
	const read = text === null ? null : readSpec(text);
	if (!read?.spec) return [];
	const named = read.spec.features.flatMap((feature) => (feature.widget ? [feature.widget] : []));
	const pageNotes = read.spec.pages.flatMap((page) => (page.note ? [page.note] : []));
	const onPages = await Promise.all(pageNotes.map((note) => widgetsOnNote(plugin, note)));
	return [...named, ...onPages.flat()];
}

export async function catalogueInstallsOf(plugin: WidgetariumPlugin): Promise<string[]> {
	const text = await plugin.app.vault.adapter.read(LOCK_PATH).catch(() => "");
	try {
		const lock: unknown = JSON.parse(text);
		return isObject(lock) && isObject(lock["widgets"]) ? Object.keys(lock["widgets"]) : [];
	} catch {
		return [];
	}
}

async function widgetsOnNote(plugin: WidgetariumPlugin, note: string): Promise<string[]> {
	const text = await plugin.app.vault.adapter.read(note).catch(() => "");
	return boardIn(text)?.tiles.map((tile) => tile.widget) ?? [];
}
