import { TFile, Notice, MarkdownRenderer, MarkdownRenderChild, Platform } from "obsidian";
import type { App, Component } from "obsidian";
import { Dialog } from "@widgetarium/core/dialog.js";
import { readBody } from "@widgetarium/core/block-writer.js";
import { hostTypeOf } from "@widgetarium/core/engine/host-type.js";
import { createCommandLine, createConsole } from "@widgetarium/core/engine/host-console.js";
import type { CommandLinePort } from "@widgetarium/core/engine/packs.js";
import type { ShapeReader } from "@widgetarium/core/engine/engine-backed.js";
import type { HostConsole, Navigation, PassageReader } from "@widgetarium/core/gateway/host.js";
import type { Unsubscribe } from "@widgetarium/core/gateway/contract.js";
import { frontmatterOf } from "./note-frontmatter.js";
import { toRecord, writeBody } from "./vault-record.js";
import type { VaultNoteRecord } from "./vault-record.js";
import { createNavigator, createReader } from "./note-links.js";
import { createSlot, pathOfEventFile } from "./folder-slot.js";
import type { FolderSlot, SlotBinding } from "./folder-slot.js";
import { basePathHeldBy, windowRequire } from "./desktop-adapter.js";

export interface HostPlugin extends Pick<Component, "addChild" | "removeChild"> {
	readonly shapes?: ShapeReader | null;
	readonly installAt?: ((ref: string) => unknown) | null;
}

export interface NoteHere {
	readonly of: "entry";
	readonly content: null;
	readonly canUpdate: true;
	get(): Promise<(VaultNoteRecord & { readonly content: string }) | null>;
	update(content: unknown): Promise<boolean>;
}

type RenderMarkdown = (element: HTMLElement, markdown: unknown, sourcePath?: string) => () => void;

export interface ObsidianHost {
	readonly shapes: ShapeReader | null;
	readonly installWidgetAt: ((ref: string) => unknown) | null;
	readonly platform: "obsidian";
	readonly type: string;
	readonly can: {
		readonly catalogue: boolean;
		readonly fullscreen: boolean;
		readonly subscribe: boolean;
		readonly network: boolean;
		readonly renderMarkdown: boolean;
	};
	readonly console: HostConsole;
	readonly commandLine: CommandLinePort;
	readonly workingDirectory: string | undefined;
	resourcePathOf(path: string): string | null;
	slot(binding: SlotBinding | null | undefined): FolderSlot;
	file(path: string): NoteHere;
	propertiesOf(path: string): string[];
	watchFile(path: string, callback: () => void): Unsubscribe;
	readonly query: { backlinks(path: string): Promise<{ path: string }[]> };
	readonly ui: {
		readonly Dialog: typeof Dialog;
		notify(message: string): void;
		renderMarkdown: RenderMarkdown;
	};
	readonly navigator: Navigation;
	readonly reader: PassageReader;
	readonly here: NoteHere | null;
	readonly notePath?: string;
	readonly app: App;
	readonly plugin: HostPlugin | null | undefined;
}

export function noteHere(app: App, notePath: string): NoteHere {
	const fileAt = (): TFile | null => {
		const found = app.vault.getAbstractFileByPath(notePath);
		return found instanceof TFile ? found : null;
	};

	return {
		of: "entry",
		// TRADE-OFF: absent here, present after get() — reading every note body to draw a board is the cost this avoids
		content: null,
		canUpdate: true,
		async get() {
			const file = fileAt();
			if (!file) return null;
			const body = readBody(await app.vault.read(file));
			return { ...toRecord(app, file, body), content: body };
		},
		async update(content) {
			const file = fileAt();
			if (!file) return false;
			return (await writeBody(app, file, content)) !== undefined;
		},
	};
}

export function createHost(app: App, plugin: HostPlugin | null | undefined, notePath = ""): ObsidianHost {
	const installAt = plugin?.installAt;
	return {
		shapes: plugin?.shapes ?? null,
		installWidgetAt: installAt ? (ref) => installAt.call(plugin, ref) : null,

		platform: "obsidian",
		type: hostTypeOf(Platform),

		can: {
			catalogue: true,
			fullscreen: true,
			subscribe: true,
			network: true,
			renderMarkdown: true,
		},

		console: createConsole(hostTypeOf(Platform), windowRequire(), basePathHeldBy(app.vault.adapter)),

		commandLine: createCommandLine(hostTypeOf(Platform), windowRequire()),

		workingDirectory: basePathHeldBy(app.vault.adapter),

		resourcePathOf(path) {
			return app.vault.adapter?.getResourcePath?.(path) ?? null;
		},

		slot(binding) {
			return createSlot(app, binding);
		},

		file(path) {
			return noteHere(app, path);
		},

		propertiesOf(path) {
			const file = app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) return [];
			return Object.keys(frontmatterOf(app, file) ?? {})
				.filter((name) => name !== "position")
				.sort();
		},

		watchFile(path, callback) {
			return watchOneNote(app, path, callback);
		},

		query: {
			async backlinks(path) {
				const resolved = app.metadataCache.resolvedLinks ?? {};
				return Object.entries(resolved)
					.filter(([, links]) => Object.keys(links).includes(path))
					.map(([source]) => ({ path: source }));
			},
		},

		ui: {
			Dialog,

			notify(message) {
				new Notice(message);
			},
			// TRADE-OFF: read mode with post-processors, not an editable live preview
			renderMarkdown(element, markdown, sourcePath = notePath) {
				return renderMarkdownInto({ app, plugin, element, markdown, sourcePath });
			},
		},

		navigator: createNavigator(app, notePath),
		reader: createReader(app, notePath),
		here: notePath ? noteHere(app, notePath) : null,

		app,
		plugin,
	};
}

export function bindNote(host: ObsidianHost, notePath: string | null | undefined): ObsidianHost {
	if (!notePath) return host;
	return {
		...host,
		notePath,
		here: noteHere(host.app, notePath),
		navigator: createNavigator(host.app, notePath),
		reader: createReader(host.app, notePath),
		ui: {
			...host.ui,
			renderMarkdown: (element, markdown, sourcePath = notePath) =>
				host.ui.renderMarkdown(element, markdown, sourcePath),
		},
	};
}

function watchOneNote(app: App, path: string, callback: () => void): Unsubscribe {
	const handler = (file: unknown): void => {
		if (pathOfEventFile(file) === path) callback();
	};
	app.vault.on("modify", handler);
	app.vault.on("delete", handler);
	app.vault.on("rename", handler);
	app.metadataCache.on("changed", handler);
	return () => {
		app.vault.off("modify", handler);
		app.vault.off("delete", handler);
		app.vault.off("rename", handler);
		app.metadataCache.off("changed", handler);
	};
}

interface MarkdownAsk {
	readonly app: App;
	readonly plugin: HostPlugin | null | undefined;
	readonly element: HTMLElement;
	readonly markdown: unknown;
	readonly sourcePath: string;
}

function renderMarkdownInto({ app, plugin, element, markdown, sourcePath }: MarkdownAsk): () => void {
	element.textContent = "";
	const childOwningTheEmbeds = new MarkdownRenderChild(element);
	plugin?.addChild(childOwningTheEmbeds);
	let isStopped = false;
	MarkdownRenderer.render(app, String(markdown ?? ""), element, sourcePath, childOwningTheEmbeds)
		.then(() => {
			if (isStopped) element.textContent = "";
		})
		.catch((failure: unknown) => console.error("[widgetarium] markdown render failed", failure));
	return function stopOnce() {
		if (isStopped) return;
		isStopped = true;
		plugin?.removeChild(childOwningTheEmbeds);
	};
}
