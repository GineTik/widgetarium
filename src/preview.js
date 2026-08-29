import { h } from "preact";
import { viewHost } from "./engine/view-host.js";
import { spanToPixels } from "./layout.js";

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

export function previewSize(manifest, cell, gap) {
	const size = manifest?.preview?.size ?? manifest?.defaultSize ?? { w: 4, h: 3 };
	return { w: size.w, h: size.h, width: spanToPixels(size.w, cell, gap), height: spanToPixels(size.h, cell, gap) };
}

// the props a widget needs to draw, with no board, no vault and no way back to either
export function previewProps(definition, options) {
	const manifest = definition?.manifest ?? {};
	const { data, actions } = previewData(manifest);
	const settings = {};
	for (const field of manifest.settings ?? []) settings[field.key] = field.default;

	const slots = {};
	for (const [name, spec] of Object.entries(manifest.slots ?? {})) {
		const child = options?.registry?.get(spec.default);
		slots[name] = child?.component && !child.error
			? (given) => h(child.component, { ...given, settings: {}, size: { w: 1, h: 1, scale: 1 }, host: options.host, context: previewContext() })
			: null;
	}

	return {
		settings: { ...settings, ...(manifest.preview?.settings ?? {}) },
		size: { w: manifest.preview?.size?.w ?? 4, h: manifest.preview?.size?.h ?? 3, scale: 1, isCollapsed: false, collapse() {}, expand() {} },
		fullscreen: { isFullscreen: false, canFullscreen: false, open() {}, close() {}, toggle() {} },
		host: options?.host ? viewHost(options.host) : { platform: "preview", can: {}, ui: { notify() {}, renderMarkdown: () => () => {} } },
		context: previewContext(manifest.preview?.context),
		board: { properties: manifest.preview?.properties ?? [] },
		configureBoard: () => false,
		configure: () => {},
		data,
		actions,
		filters: {},
		slots,
		mounts: {},
	};
}
