import { TFile, TFolder } from "obsidian";
import type { App, TAbstractFile } from "obsidian";
import { studioNoteOfFile } from "./studio-drawing.js";
import { APP_KEY, appNotePathOf, renamedFolderOf, studioNoteOf } from "./studio-note.js";

export async function followAppFolderRename(app: App, moved: TAbstractFile, was: string): Promise<void> {
	if (!(moved instanceof TFolder)) return;
	const beside = besideNoteNaming(app, was);
	await renameInNotesNaming(app, was, moved.path);
	if (beside === null) return;
	console.info(`[widgetarium] app note ${beside.path} → ${appNotePathOf(moved.path)}`);
	await app.fileManager.renameFile(beside, appNotePathOf(moved.path));
}

function besideNoteNaming(app: App, folder: string): TFile | null {
	const note = app.vault.getAbstractFileByPath(appNotePathOf(folder));
	if (!(note instanceof TFile)) return null;
	return studioNoteOfFile(app, note)?.folder === folder ? note : null;
}

async function renameInNotesNaming(app: App, was: string, now: string): Promise<void> {
	for (const note of app.vault.getMarkdownFiles()) {
		if (renamedIn(studioNoteOfFile(app, note)?.folder, was, now) === null) continue;
		await app.fileManager.processFrontMatter(note, (front: Record<string, unknown>) => {
			const named = studioNoteOf(front)?.folder;
			const renamed = renamedIn(named, was, now);
			if (renamed === null) return;
			console.info(`[widgetarium] ${note.path}: ${APP_KEY} ${named} → ${renamed}`);
			front[APP_KEY] = renamed;
		});
	}
}

function renamedIn(named: string | undefined, was: string, now: string): string | null {
	return named === undefined ? null : renamedFolderOf(named, was, now);
}
