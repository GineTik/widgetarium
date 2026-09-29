import { TFile, Notice, MarkdownRenderer, MarkdownRenderChild, Platform } from "obsidian";
import { Dialog } from "@widgetarium/core/dialog.js";
import { readBody } from "@widgetarium/core/block-writer.js";
import { hostTypeOf } from "@widgetarium/core/engine/host-type.js";
import { createConsole } from "@widgetarium/core/engine/host-console.js";
import { frontmatterOf } from "./note-frontmatter.js";
import { toRecord, writeBody } from "./vault-record.js";
import { createNavigator, createReader } from "./note-links.js";
import { createSlot } from "./folder-slot.js";

export function noteHere(app, notePath) {
	const fileAt = () => {
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

export function createHost(app, plugin, notePath = "") {
	return {
		shapes: plugin?.shapes ?? null,
		installWidgetAt: plugin?.installAt ? (ref) => plugin.installAt(ref) : null,

		platform: "obsidian",
		type: hostTypeOf(Platform),

		can: {
			catalogue: true,
			fullscreen: true,
			subscribe: true,
			network: true,
			renderMarkdown: true,
		},

		console: createConsole(hostTypeOf(Platform), window.require?.bind(window), app.vault.adapter?.basePath),

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
				return renderMarkdownInto(app, plugin, element, markdown, sourcePath);
			},
		},

		navigator: createNavigator(app, notePath),
		reader: createReader(app, notePath),
		here: notePath ? noteHere(app, notePath) : null,

		app,
		plugin,
	};
}

export function bindNote(host, notePath) {
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

function watchOneNote(app, path, callback) {
	const handler = (file) => {
		if (file?.path === path) callback();
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

function renderMarkdownInto(app, plugin, element, markdown, sourcePath) {
	element.textContent = "";
	const childOwningTheEmbeds = new MarkdownRenderChild(element);
	plugin.addChild(childOwningTheEmbeds);
	let isStopped = false;
	MarkdownRenderer.render(app, String(markdown ?? ""), element, sourcePath, childOwningTheEmbeds)
		.then(() => {
			if (isStopped) element.textContent = "";
		})
		.catch((failure) => console.error("[widgetarium] markdown render failed", failure));
	return function stopOnce() {
		if (isStopped) return;
		isStopped = true;
		plugin.removeChild(childOwningTheEmbeds);
	};
}
