import { TFile } from "obsidian";
import type { App, TAbstractFile } from "obsidian";

export interface SpecPort {
	read(path: string): Promise<string | null>;
	watch(path: string, onChange: () => void): () => void;
	change(path: string, edit: (text: string) => string): Promise<void>;
}

const NO_SPEC_FILE = "There is no spec at {path} to change.";

export function createSpecPort(app: App): SpecPort {
	return {
		read: (path) => readNote(app, path),
		watch: (path, onChange) => watchNote(app, path, onChange),
		change: (path, edit) => changeNote(app, path, edit),
	};
}

function fileAt(app: App, path: string): TFile | null {
	const found = app.vault.getAbstractFileByPath(path);
	return found instanceof TFile ? found : null;
}

async function readNote(app: App, path: string): Promise<string | null> {
	const file = fileAt(app, path);
	return file ? app.vault.read(file) : null;
}

function watchNote(app: App, path: string, onChange: () => void): () => void {
	const isOurs = (file: TAbstractFile, oldPath?: string): void => {
		if (file.path === path || oldPath === path) onChange();
	};
	const refs = [
		app.vault.on("modify", isOurs),
		app.vault.on("create", isOurs),
		app.vault.on("delete", isOurs),
		app.vault.on("rename", isOurs),
	];
	return () => refs.forEach((ref) => app.vault.offref(ref));
}

async function changeNote(app: App, path: string, edit: (text: string) => string): Promise<void> {
	const file = fileAt(app, path);
	if (!file) throw new Error(NO_SPEC_FILE.replace("{path}", path));
	await app.vault.process(file, edit);
}
