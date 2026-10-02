import { Modal, Platform, TFile, getAllTags, requestUrl } from "obsidian";
import type { App } from "obsidian";
import { createCommandLine } from "@widgetarium/core/engine/host-console.js";
import { hostTypeOf } from "@widgetarium/core/engine/host-type.js";
import type { CommandLinePort, NetworkPort, VaultNote, VaultPort } from "@widgetarium/core/engine/packs.js";
import { basePathHeldBy, windowRequire } from "./desktop-adapter.js";
import { createSlot } from "./folder-slot.js";

export interface PackPorts {
	readonly commandLine: CommandLinePort;
	readonly workingDirectory: string | undefined;
	readonly network: NetworkPort;
	readonly vault: VaultPort;
	confirm(said: string): Promise<boolean>;
}

const CONFIRM = "Go ahead";
const CANCEL = "Cancel";

export function packPortsOf(app: App): PackPorts {
	return {
		commandLine: createCommandLine(hostTypeOf(Platform), windowRequire()),
		workingDirectory: basePathHeldBy(app.vault.adapter),
		network: createNetwork(),
		vault: createVaultPort(app),
		confirm: confirmIn(app),
	};
}

function createNetwork(): NetworkPort {
	return {
		can: true,
		request: async (url, ask) => {
			const answer = await requestUrl({
				url,
				method: ask.method ?? "GET",
				...(ask.body === undefined || ask.body === "" ? {} : { body: ask.body }),
				...(ask.headers ? { headers: { ...ask.headers } } : {}),
				throw: false,
			});
			return { status: answer.status, text: answer.text };
		},
	};
}

function createVaultPort(app: App): VaultPort {
	return {
		can: true,
		folder: (path) => createSlot(app, { path }),
		notesTagged: async (tag) => notesWhere(app, (file) => tagsOf(app, file).includes(tag.toLowerCase())),
		notesMatching: async (text) => notesWhere(app, (file) => isMatching(app, file, text.toLowerCase())),
		open: (path) => {
			void app.workspace.openLinkText(path, "", false);
		},
	};
}

function confirmIn(app: App): (said: string) => Promise<boolean> {
	return (said) =>
		new Promise((settle) => {
			const modal = new Modal(app);
			let isAnswered = false;
			const answer = (isYes: boolean): void => {
				isAnswered = true;
				settle(isYes);
				modal.close();
			};
			modal.contentEl.createEl("p", { text: said });
			const row = modal.contentEl.createDiv({ cls: "modal-button-container" });
			row.createEl("button", { text: CANCEL }).addEventListener("click", () => answer(false));
			row.createEl("button", { text: CONFIRM, cls: "mod-cta" }).addEventListener("click", () => answer(true));
			modal.onClose = () => {
				if (!isAnswered) settle(false);
			};
			modal.open();
		});
}

function notesWhere(app: App, isKept: (file: TFile) => boolean): VaultNote[] {
	return app.vault
		.getMarkdownFiles()
		.filter(isKept)
		.sort((one, other) => one.path.localeCompare(other.path))
		.map((file) => ({ path: file.path, name: file.basename, props: frontmatterIn(app, file) }));
}

function tagsOf(app: App, file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);
	return (cache ? (getAllTags(cache) ?? []) : []).map((tag) => tag.replace(/^#/, "").toLowerCase());
}

function isMatching(app: App, file: TFile, text: string): boolean {
	if (file.basename.toLowerCase().includes(text)) return true;
	return Object.values(frontmatterIn(app, file)).some((held) =>
		JSON.stringify(held ?? "")
			.toLowerCase()
			.includes(text),
	);
}

function frontmatterIn(app: App, file: TFile): Readonly<Record<string, unknown>> {
	const held: unknown = app.metadataCache.getFileCache(file)?.frontmatter;
	return typeof held === "object" && held !== null ? { ...held } : {};
}
