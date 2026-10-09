import type { DataAdapter } from "obsidian";
import { SPEC_FOLDER, readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import type { AppSpec, SpecRead } from "@widgetarium/core/app-spec.js";

export interface AppScreen {
	readonly app: string;
	readonly screen: string;
}

export async function appScreenOfNote(adapter: DataAdapter, note: string): Promise<AppScreen | null> {
	if (!(await adapter.exists(SPEC_FOLDER))) return null;
	const { folders } = await adapter.list(SPEC_FOLDER);
	for (const folder of folders) {
		const app = folder.slice(folder.lastIndexOf("/") + 1);
		const page = (await readAppSpec(adapter, app))?.spec?.pages.find((one) => one.note === note);
		if (page) return { app, screen: page.name };
	}
	return null;
}

export async function readAppSpec(adapter: DataAdapter, app: string): Promise<SpecRead | null> {
	const text = await adapter.read(specPathOf(app)).catch(() => null);
	if (text === null) return null;
	return readSpec(text);
}

export function noteToReturnTo(pages: AppSpec["pages"], canvasPage: string, fromNote: string): string | null {
	const shown = pages.find((page) => page.name === canvasPage)?.note;
	if (shown) return shown;
	if (fromNote) return fromNote;
	return pages.find((page) => page.note)?.note ?? null;
}
