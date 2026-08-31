import { createElement as h } from "react";
import { viewHost } from "./engine/view-host.js";
import { spanToPixels } from "./layout.js";
import { typeOf } from "./engine/record-type.js";
import { NO_HOST } from "./engine/host-none.js";
import { refusedRead } from "./engine/read-file.js";
import { settingDefaults } from "./engine/widget-settings.js";

// A WIDGET DRAWN WITH NOBODY BEHIND IT. The catalogue shows a widget before it has a board, a
// folder or a person's notes — so everything it would normally read comes from its own manifest,
// and everything it would normally write is refused. Browsing must not be able to touch a vault.

// CONTEXT: the shape src/host.js hands a widget, built from a plain object instead of a file
function toRecord(row, index) {
	const path = row.path ?? `preview/${index + 1}.md`;
	const { path: given, body, ...props } = row;
	return {
		path,
		ref: { path },
		props,
		name: props.title ?? path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, ""),
		type: typeOf(path),
		meta: { created: 0, modified: 0 },
		attachments: 0,
		body,
	};
}

function refuse(what) {
	return () => {
		console.warn(`Widgetarium: a preview cannot ${what} — it is a picture of a widget, not the widget`);
		return null;
	};
}

// TRADE-OFF: every action is present and answers false, rather than absent — a widget that asks
// `canCreate` gets an answer, and one that calls create anyway gets a refusal instead of a crash
export function previewData(manifest) {
	const declared = manifest?.preview?.sources ?? {};
	const data = {};
	const actions = {};
	for (const name of Object.keys(manifest?.sources ?? {})) {
		const rows = (declared[name]?.rows ?? []).map(toRecord);
		data[name] = { rows, total: rows.length, isLoading: false, failure: null };
		actions[name] = {
			canCreate: false,
			canUpdate: false,
			canRemove: false,
			canOpen: false,
			create: refuse("create a note"),
			update: refuse("write a note"),
			remove: refuse("remove a note"),
			open: refuse("open a note"),
			get: async (ref) => rows.find((row) => row.path === ref?.path) ?? null,
		};
	}
	return { data, actions };
}

// CONTEXT: local to this one preview, so two previews of one widget cannot collide over a key
function previewContext(seed) {
	const held = new Map(Object.entries(seed ?? {}));
	return {
		get: (key) => held.get(key),
		set: () => false,
		release: () => {},
		offered: () => [...held.keys()],
		subscribe: () => () => {},
	};
}

// CONTEXT: a picture of a widget still needs somewhere to BE — a passage when the preview is
// of text becoming a widget, an entry when it is of a tile
export function previewHere(content = null) {
	return {
		of: content === null ? "entry" : "passage",
		content,
		canUpdate: false,
		get: async () => ({ of: content === null ? "entry" : "passage", path: "preview.md", props: {}, content }),
		update: refuse("write what it is standing in"),
	};
}

export const previewNavigator = {
	canNavigate: false,
	resolve: () => null,
	navigate: () => {
		console.warn("Widgetarium: a preview cannot navigate — it is a picture of a widget, not the widget");
		return false;
	},
};

// CONTEXT: a preview reads the files its manifest declares, exactly as it reads the rows it declares
export function previewReader(manifest) {
	const declared = manifest?.preview?.files ?? {};
	return {
		canRead: true,
		async read(link) {
			const named = String(link ?? "").trim();
			const text = declared[named];
			if (text === undefined) return refusedRead(`${named || "that file"} is not in this preview`);
			return { ok: true, text, path: named, bytes: text.length, failure: null };
		},
	};
}

// TRADE-OFF: the real environment when there is one — a catalogue tile that cannot render
// markdown draws a widget nobody could judge
export function previewHost(host) {
	return host ? viewHost(host) : NO_HOST;
}

export function previewSize(manifest, cell, gap) {
	const size = manifest?.preview?.size ?? manifest?.defaultSize ?? { w: 4, h: 3 };
	return { w: size.w, h: size.h, width: spanToPixels(size.w, cell, gap), height: spanToPixels(size.h, cell, gap) };
}

// the props a widget needs to draw, with no board, no vault and no way back to either
export function previewProps(definition, options) {
	const manifest = definition?.manifest ?? {};
	const { data, actions } = previewData(manifest);
	const settings = settingDefaults(manifest);

	const slots = {};
	for (const [name, spec] of Object.entries(manifest.slots ?? {})) {
		const child = options?.registry?.get(spec.default);
		slots[name] = child?.component && !child.error
			? (given) => h(child.component, { ...given, settings: {}, size: { w: 1, h: 1, scale: 1 }, host: previewHost(options.host), context: previewContext() })
			: null;
	}

	// CONTEXT: an inline widget is drawn from the text its manifest offers, the way a board
	// widget is drawn from the settings its manifest offers
	const content = manifest.inline ? (manifest.preview?.content ?? manifest.title ?? "Sample text") : null;

	return {
		here: previewHere(content),
		navigator: previewNavigator,
		reader: previewReader(manifest),
		content,
		settings: { ...settings, ...(manifest.preview?.settings ?? {}) },
		size: { w: manifest.preview?.size?.w ?? 4, h: manifest.preview?.size?.h ?? 3, scale: 1, isCollapsed: false, collapse() {}, expand() {} },
		fullscreen: { isFullscreen: false, canFullscreen: false, open() {}, close() {}, toggle() {} },
		host: previewHost(options?.host),
		context: previewContext(manifest.preview?.context),
		// CONTEXT: the sample world hears everything the widget offers, so it draws its working face
		board: { properties: manifest.preview?.properties ?? [], archivedColumns: manifest.preview?.archivedColumns ?? [], consumes: manifest.provides ?? [] },
		configureBoard: () => false,
		configure: () => {},
		data,
		actions,
		filters: {},
		slots,
		mounts: {},
	};
}
