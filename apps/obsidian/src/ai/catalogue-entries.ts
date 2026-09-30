import { isObject } from "@widgetarium/core/engine/is-object.js";
import { SOURCE_FILES, javascriptSourceRefusal } from "@widgetarium/core/engine/widget-build.js";
import { cardIn } from "./entries.js";
import { foldersIn, readJson, widgetFilesIn } from "./vault-files.js";
import { offeredBySource } from "./offered.js";
import type { CatalogueSource } from "./offered.js";
import { INDEX_PATH, PLUGIN_DATA, WIDGETS_DIR } from "./cli-paths.js";
import { cardFrom, mergeEntries } from "./widget-entry.js";
import type { WidgetEntry } from "./widget-entry.js";

const STEPS_OUT_OF_THE_REPOSITORY = /^\/|(^|\/)\.\.(\/|$)/;

export async function installedWidgets(): Promise<WidgetEntry[]> {
	const found: WidgetEntry[] = [];
	for (const scope of await foldersIn(WIDGETS_DIR)) {
		for (const folder of await foldersIn(scope)) {
			const files = await widgetFilesIn(folder);
			sayJavascriptRefused(files, folder);
			if (!files.some((name) => SOURCE_FILES.includes(name))) continue;
			const manifest = (await cardIn(folder)) ?? {};
			const named = isObject(manifest) ? manifest["id"] : undefined;
			const id = typeof named === "string" && named !== "" ? named : idOfFolder(folder);
			found.push(cardFrom(manifest, id, { installed: true, folder, files }));
		}
	}
	return found;
}

export async function configuredSources(): Promise<CatalogueSource[]> {
	const index = objectIn(await readJson(INDEX_PATH, null));
	const data = objectIn(await readJson(PLUGIN_DATA, null));
	const listed = [...arrayIn(data["registries"]), ...arrayIn(index["sources"])];
	return listed.flatMap((source) => {
		const read = sourceOf(source);
		return read.repository || read.path ? [read] : [];
	});
}

export async function offeredWidgets(): Promise<WidgetEntry[]> {
	const index = objectIn(await readJson(INDEX_PATH, null));
	const listed = arrayIn(index["widgets"]).flatMap((row) => {
		const held = objectIn(row);
		const id = held["id"];
		if (typeof id !== "string" || id === "") return [];
		const origin = held["repository"];
		return [
			cardFrom(row, id, {
				installed: false,
				origin: typeof origin === "string" ? origin : null,
				path: pathInsideTheRepository(held["path"]),
			}),
		];
	});
	const fetched: WidgetEntry[] = [];
	for (const source of await configuredSources()) fetched.push(...(await offeredBySource(source, cardFrom)));
	return [...listed, ...fetched];
}

export async function everyWidget(): Promise<WidgetEntry[]> {
	return mergeEntries(await installedWidgets(), await offeredWidgets());
}

export async function entryById(id: string): Promise<WidgetEntry | null> {
	return (await everyWidget()).find((entry) => entry.id === id) ?? null;
}

function idOfFolder(folder: string): string {
	const parts = folder.split(/[\\/]/);
	const scope = parts[parts.length - 2] ?? "";
	return scope.startsWith("@") ? `${scope}/${parts[parts.length - 1] ?? ""}` : "";
}

function pathInsideTheRepository(path: unknown): string | null {
	return typeof path === "string" && !STEPS_OUT_OF_THE_REPOSITORY.test(path) ? path : null;
}

function sayJavascriptRefused(files: readonly string[], folder: string): void {
	const refusal = javascriptSourceRefusal(files, folder);
	if (refusal) console.error(refusal);
}

function objectIn(held: unknown): Readonly<Record<string, unknown>> {
	return isObject(held) ? held : {};
}

function arrayIn(held: unknown): readonly unknown[] {
	return Array.isArray(held) ? held : [];
}

function sourceOf(held: unknown): CatalogueSource {
	const raw = objectIn(held);
	return { ...raw, repository: textIn(raw["repository"]), path: textIn(raw["path"]), ref: textIn(raw["ref"]) };
}

function textIn(held: unknown): string | undefined {
	return typeof held === "string" ? held : undefined;
}
