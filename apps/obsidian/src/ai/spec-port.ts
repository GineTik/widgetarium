import type { App } from "obsidian";

export interface SpecPort {
	read(path: string): Promise<string | null>;
	watch(path: string, onChange: () => void): () => void;
	change(path: string, edit: (text: string) => string): Promise<void>;
}

const NO_SPEC_FILE = "There is no spec at {path} to change.";
const STAT_EVERY_MS = 1000;

export function createSpecPort(app: App): SpecPort {
	return {
		read: (path) => readSpecFile(app, path),
		watch: (path, onChange) => watchSpecFile(app, path, onChange),
		change: (path, edit) => changeSpecFile(app, path, edit),
	};
}

async function readSpecFile(app: App, path: string): Promise<string | null> {
	const { adapter } = app.vault;
	return (await adapter.exists(path)) ? adapter.read(path) : null;
}

// TRADE-OFF: polls the file's mtime, because the vault index and its events skip the .widgetarium folder
function watchSpecFile(app: App, path: string, onChange: () => void): () => void {
	let seen: number | null = null;
	const timer = window.setInterval(() => {
		void app.vault.adapter.stat(path).then((stat) => {
			const mtime = stat?.mtime ?? -1;
			if (seen !== null && mtime !== seen) onChange();
			seen = mtime;
		});
	}, STAT_EVERY_MS);
	return () => window.clearInterval(timer);
}

async function changeSpecFile(app: App, path: string, edit: (text: string) => string): Promise<void> {
	const { adapter } = app.vault;
	if (!(await adapter.exists(path))) throw new Error(NO_SPEC_FILE.replace("{path}", path));
	await adapter.process(path, edit);
}
