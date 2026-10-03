import type { App } from "obsidian";
import { isScreenNote } from "./board-note.js";

const NOTE_EXTENSION = ".md";
const DOWNLOADS_AT_ONCE = 4;

export async function warmLikelyNotes(app: App): Promise<number> {
	const queue = likelyNotePathsOf(app);
	const downloadNext = async (): Promise<void> => {
		for (let path = queue.shift(); path !== undefined; path = queue.shift())
			await app.vault.adapter.read(path).catch(() => null);
	};
	const total = queue.length;
	await Promise.all(Array.from({ length: DOWNLOADS_AT_ONCE }, downloadNext));
	return total;
}

function likelyNotePathsOf(app: App): string[] {
	const screens = app.vault
		.getMarkdownFiles()
		.filter((file) => isScreenNote(app.metadataCache.getFileCache(file)?.frontmatter))
		.map((file) => file.path);
	const recent = app.workspace.getLastOpenFiles().filter((path) => path.endsWith(NOTE_EXTENSION));
	return [...new Set([...recent, ...screens])];
}
