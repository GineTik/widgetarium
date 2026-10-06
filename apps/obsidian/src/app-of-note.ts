import type { DataAdapter } from "obsidian";
import { SPEC_FOLDER, readSpec, specPathOf } from "@widgetarium/core/app-spec.js";

export interface AppScreen {
	readonly app: string;
	readonly screen: string;
}

export async function appScreenOfNote(adapter: DataAdapter, note: string): Promise<AppScreen | null> {
	if (!(await adapter.exists(SPEC_FOLDER))) return null;
	const { folders } = await adapter.list(SPEC_FOLDER);
	for (const folder of folders) {
		const app = folder.slice(folder.lastIndexOf("/") + 1);
		const text = await adapter.read(specPathOf(app)).catch(() => null);
		const page = text === null ? undefined : readSpec(text).spec?.pages.find((one) => one.note === note);
		if (page) return { app, screen: page.name };
	}
	return null;
}
